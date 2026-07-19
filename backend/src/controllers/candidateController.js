import { asyncWrap } from "../utils/appError.js";
import ApiResponse from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";
import * as candidateService from "../services/candidateService.js";
import * as jobService from "../services/jobService.js";
import Candidate from "../models/candidateModel.js";

export const uploadCandidatesController = asyncWrap(async (req, res) => {
  if (!req.files?.length) throw new AppError(400, "No files uploaded");
  const result = await candidateService.handleUpload(req.params.jobId, req.user.id, req.files);
  res.status(202).json(new ApiResponse(202, result, "Upload accepted, processing started"));
});

export const getCandidatesController = asyncWrap(async (req, res) => {
  const job = await jobService.getJobById(req.user.id, req.params.jobId);
  const limit = Number(req.query.limit) || job.totalCandidatesNeeded;
  const candidates = await Candidate.find({ jobId: job._id, excluded: false })
    .sort({ finalScore: -1 })
    .limit(limit);
  res.status(200).json(new ApiResponse(200, candidates, "Candidates fetched"));
});

export const getCandidateByIdController = asyncWrap(async (req, res) => {
  await jobService.getJobById(req.user.id, req.params.jobId); // throws 404 if this job isn't the caller's
  const candidate = await Candidate.findOne({
    _id: req.params.candidateId,
    jobId: req.params.jobId,
  });
  if (!candidate) throw new AppError(404, "Candidate not found");
  res.status(200).json(new ApiResponse(200, candidate, "Candidate fetched"));
});

export const updateCandidateController = asyncWrap(async (req, res) => {
  await jobService.getJobById(req.user.id, req.params.jobId); // throws 404 if this job isn't the caller's
  const { hrNotes, excluded, manualScoreOverride } = req.body;
  const candidate = await Candidate.findOneAndUpdate(
    { _id: req.params.candidateId, jobId: req.params.jobId },
    { hrNotes, excluded, manualScoreOverride },
    { new: true },
  );
  if (!candidate) throw new AppError(404, "Candidate not found");
  res.status(200).json(new ApiResponse(200, candidate, "Candidate updated"));
});