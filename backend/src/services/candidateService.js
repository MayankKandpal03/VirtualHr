import multer from "multer";
import AdmZip from "adm-zip";
import Job from "../models/jobModel.js";
import Candidate from "../models/candidateModel.js";
import { analyzeResume } from "./geminiService.js";
import { computeFinalScore } from "./scoringService.js";
import { runWithConcurrencyLimit } from "../utils/concurrency.js";
import { getIO } from "../sockets/socket.js";
import { AppError } from "../utils/appError.js";

const ALLOWED_TYPES = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};
// no .doc/.docx support yet — that needs a text-extraction step (mammoth) on top of this;
// left out for now to keep this pass to only-what's-necessary dependencies

export const upload = multer({
  storage: multer.memoryStorage(), // buffer only — nothing written to disk, nothing to persist yet
  limits: { fileSize: 8 * 1024 * 1024, files: 50 },
});

const guessMimeType = (filename) => {
  const ext = filename.split(".").pop().toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "unknown";
};

// Splits a mixed upload (individual files + zips) into allowed files vs. rejected ones.
// Extension-based check for zip contents since multer's mimetype detection only covers
// the top-level upload — worth hardening with real magic-byte sniffing before this is public-facing.
const extractFiles = (files) => {
  const extracted = [];
  const rejected = [];

  for (const file of files) {
    const isZip = file.mimetype === "application/zip" || file.originalname.endsWith(".zip");

    if (isZip) {
      // was unguarded — a corrupt/non-zip file with a .zip extension threw
      // synchronously here and turned the whole upload into a raw 500 instead
      // of just rejecting that one file.
      let zip;
      try {
        zip = new AdmZip(file.buffer);
      } catch {
        rejected.push({ name: file.originalname, reason: "Corrupt or unreadable zip file" });
        continue;
      }

      for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        const mimetype = guessMimeType(entry.entryName);
        if (ALLOWED_TYPES[mimetype]) {
          extracted.push({ originalname: entry.entryName, buffer: entry.getData(), mimetype });
        } else {
          rejected.push({ name: entry.entryName, reason: "Unsupported file type" });
        }
      }
    } else if (ALLOWED_TYPES[file.mimetype]) {
      extracted.push(file);
    } else {
      rejected.push({ name: file.originalname, reason: "Unsupported file type" });
    }
  }

  return { extracted, rejected };
};

export const handleUpload = async (jobId, userId, files) => {
  const job = await Job.findOne({ _id: jobId, createdBy: userId });
  if (!job) throw new AppError(404, "Job not found");

  const { extracted, rejected } = extractFiles(files);
  if (!extracted.length) {
    throw new AppError(400, "No valid files found in upload", rejected);
  }

  const candidateDocs = await Candidate.insertMany(
    extracted.map((f) => ({
      jobId: job._id,
      createdBy: userId,
      fileName: f.originalname,
      fileType: ALLOWED_TYPES[f.mimetype],
      status: "pending",
    })),
  );

  job.totalResumesUploaded += extracted.length;
  job.status = "processing";
  await job.save();

  // Respond to the request immediately, then process in the background —
  // this is the non-blocking substitute for a real queue. Trade-off: if the
  // process restarts mid-batch, whatever was in flight is lost with no retry.
  // That gap is specifically what BullMQ/Redis would close later, not something fixed here.
  processCandidates(job, candidateDocs, extracted).catch(async (err) => {
    // was a bare console.error — candidates were left stuck on "pending" forever
    // with no signal to the frontend that anything had gone wrong at all.
    console.error(`Background processing failed for job ${job._id}:`, err);
    try {
      await Job.findByIdAndUpdate(job._id, { status: "failed" });
      getIO().to(`job:${job._id}`).emit("job:failed", { jobId: job._id, error: err.message });
    } catch (innerErr) {
      console.error(`Also failed to mark job ${job._id} as failed:`, innerErr);
    }
  });

  return { accepted: candidateDocs.length, rejected, jobId: job._id };
};

const CONCURRENCY = 3; // simultaneous Gemini calls — raise/lower based on your actual rate limit

const processCandidates = async (job, candidateDocs, files) => {
  const io = getIO();

  await runWithConcurrencyLimit(candidateDocs, CONCURRENCY, async (candidate, i) => {
    const file = files[i];
    try {
      const result = await analyzeResume(job, file.buffer, file.mimetype);
      const finalScore = computeFinalScore(result.subScores, job.scoringWeights);

      await Candidate.findByIdAndUpdate(candidate._id, {
        ...result,
        finalScore,
        status: "processed",
      });

      await Job.findByIdAndUpdate(job._id, { $inc: { totalResumesProcessed: 1 } });

      io.to(`job:${job._id}`).emit("candidate:processed", {
        candidateId: candidate._id,
        finalScore,
      });
    } catch (err) {
      await Candidate.findByIdAndUpdate(candidate._id, {
        status: "failed",
        processingError: err.message,
      });

      // was missing on this branch — totalResumesProcessed only ever incremented
      // on success, so any batch with at least one failure could never reach
      // totalResumesUploaded. A progress bar built on those two numbers would
      // stall just short of 100% forever, even after the job actually finished.
      await Job.findByIdAndUpdate(job._id, { $inc: { totalResumesProcessed: 1 } });

      io.to(`job:${job._id}`).emit("candidate:failed", {
        candidateId: candidate._id,
        error: err.message,
      });
    }
  });

  await Job.findByIdAndUpdate(job._id, { status: "completed" });
  io.to(`job:${job._id}`).emit("job:completed", { jobId: job._id });
};
