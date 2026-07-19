import { asyncWrap } from "../utils/appError.js";
import ApiResponse from "../utils/apiResponse.js";
import * as jobService from "../services/jobService.js";

export const createJobController = asyncWrap(async (req, res) => {
  const job = await jobService.createJob(req.user.id, req.body);
  res.status(201).json(new ApiResponse(201, job, "Job created"));
});

export const getJobsController = asyncWrap(async (req, res) => {
  const jobs = await jobService.getJobs(req.user.id);
  res.status(200).json(new ApiResponse(200, jobs, "Jobs fetched"));
});

export const getJobByIdController = asyncWrap(async (req, res) => {
  const job = await jobService.getJobById(req.user.id, req.params.jobId);
  res.status(200).json(new ApiResponse(200, job, "Job fetched"));
});

export const updateScoringWeightsController = asyncWrap(async (req, res) => {
  const job = await jobService.updateScoringWeights(
    req.user.id,
    req.params.jobId,
    req.body.priorityScore,
  );
  res.status(200).json(new ApiResponse(200, job, "Scoring weights updated"));
});
