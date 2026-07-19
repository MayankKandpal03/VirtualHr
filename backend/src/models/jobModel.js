import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    // scoping key — there's no separate Company model yet, so the owning User
    // IS the tenant boundary for now (see note in accompanying message)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true }, // full JD text
    requiredSkills: [{ type: String }],
    experienceRequired: {
      min: { type: Number, default: 0 },
      max: { type: Number },
    },
    qualification: { type: String },
    otherRequirements: { type: String }, // free-text "must know X"
    totalCandidatesNeeded: { type: Number, default: 10 }, // HR's "show me top N"
    scoringWeights: {
      skillMatch: { type: Number, default: 0.35 },
      experience: { type: Number, default: 0.25 },
      expertise: { type: Number, default: 0.25 },
      qualification: { type: Number, default: 0.15 },
    },
    status: {
      type: String,
      enum: ["draft", "processing", "completed", "failed"],
      default: "draft",
    },
    totalResumesUploaded: { type: Number, default: 0 },
    totalResumesProcessed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Job = mongoose.model("Job", jobSchema);
export default Job;
