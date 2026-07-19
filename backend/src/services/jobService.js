import Job from "../models/jobModel.js";
import { AppError } from "../utils/appError.js";
import { weightsFromSlider, recomputeJobScores } from "./scoringService.js";

export const createJob = async (userId, payload) => {
  const {
    title,
    description,
    requiredSkills,
    experienceMin,
    experienceMax,
    qualification,
    otherRequirements,
    totalCandidatesNeeded,
    priorityScore, // 0-100 slider value from the frontend: 0 = experience, 100 = expertise
  } = payload;

  const missingFields = [];
  if (!title) missingFields.push("title");
  if (!description) missingFields.push("description");
  if (missingFields.length) {
    throw new AppError(400, "Missing required fields", missingFields);
  }

  return Job.create({
    createdBy: userId,
    title,
    description,
    requiredSkills: requiredSkills || [],
    experienceRequired: { min: experienceMin || 0, max: experienceMax },
    qualification,
    otherRequirements,
    totalCandidatesNeeded: totalCandidatesNeeded || 10,
    scoringWeights: weightsFromSlider(priorityScore ?? 50),
  });
};

export const getJobs = (userId) => Job.find({ createdBy: userId }).sort({ createdAt: -1 });

export const getJobById = async (userId, jobId) => {
  const job = await Job.findOne({ _id: jobId, createdBy: userId });
  if (!job) throw new AppError(404, "Job not found");
  return job;
};

export const updateScoringWeights = async (userId, jobId, priorityScore) => {
  const job = await getJobById(userId, jobId);
  job.scoringWeights = weightsFromSlider(priorityScore);
  await job.save();
  await recomputeJobScores(job._id); // instant re-rank, no Gemini calls
  return job;
};
