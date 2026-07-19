import Job from "../models/jobModel.js";
import Candidate from "../models/candidateModel.js";

export const computeFinalScore = (subScores, weights) =>
  subScores.skillMatch * weights.skillMatch +
  subScores.experience * weights.experience +
  subScores.expertise * weights.expertise +
  subScores.qualification * weights.qualification;

const EXPERIENCE_PRESET = { skillMatch: 0.3, experience: 0.4, expertise: 0.15, qualification: 0.15 };
const EXPERTISE_PRESET = { skillMatch: 0.3, experience: 0.15, expertise: 0.4, qualification: 0.15 };

// sliderValue: 0 = fully prioritize experience, 100 = fully prioritize expertise/project quality
export const weightsFromSlider = (sliderValue = 50) => {
  const t = Math.min(100, Math.max(0, sliderValue)) / 100;
  return Object.fromEntries(
    Object.keys(EXPERIENCE_PRESET).map((key) => [
      key,
      EXPERIENCE_PRESET[key] * (1 - t) + EXPERTISE_PRESET[key] * t,
    ]),
  );
};

// Re-run whenever HR changes a job's weights — cheap, no Gemini calls involved
export const recomputeJobScores = async (jobId) => {
  const job = await Job.findById(jobId);
  const candidates = await Candidate.find({ jobId, status: "processed" });

  await Promise.all(
    candidates.map((c) =>
      Candidate.updateOne(
        { _id: c._id },
        { finalScore: computeFinalScore(c.subScores, job.scoringWeights) },
      ),
    ),
  );
};
