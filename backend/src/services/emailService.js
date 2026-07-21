import nodemailer from "nodemailer";
import Job from "../models/jobModel.js";
import Candidate from "../models/candidateModel.js";
import { AppError } from "../utils/appError.js";

// Plain SMTP transport — works with a Gmail app password for now, or any real
// provider (SES, Postmark, SendGrid's SMTP relay, etc.) later without a code change.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587/25
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const fillTemplate = (template, candidate, job) =>
  template
    .replaceAll("{{name}}", candidate.name || "Candidate")
    .replaceAll("{{jobTitle}}", job.title)
    .replaceAll("{{score}}", Math.round(candidate.finalScore ?? 0));

export const sendBulkEmails = async (userId, jobId, { candidateIds, subject, template }) => {
  if (!subject || !template) {
    throw new AppError(400, "Missing required fields", ["subject", "template"]);
  }
  // was missing — without this, an empty/missing candidateIds falls through to
  // `Candidate.find({ _id: { $in: undefined } ... })`, which throws a raw Mongo
  // cast error (500) instead of a clean 400.
  if (!Array.isArray(candidateIds) || !candidateIds.length) {
    throw new AppError(400, "candidateIds must be a non-empty array");
  }

  const job = await Job.findOne({ _id: jobId, createdBy: userId });
  if (!job) throw new AppError(404, "Job not found");

  const candidates = await Candidate.find({
    _id: { $in: candidateIds },
    jobId,
    status: "processed",
  });
  if (!candidates.length) throw new AppError(400, "No matching candidates found");

  const emailable = candidates.filter((c) => c.email);

  // allSettled, not all — one bounced/invalid address shouldn't fail the whole batch
  const results = await Promise.allSettled(
    emailable.map((c) =>
      transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: c.email,
        subject,
        html: fillTemplate(template, c, job),
      }),
    ),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  return {
    sent,
    failed,
    skippedNoEmail: candidates.length - emailable.length,
    totalRequested: candidateIds.length,
  };
};
