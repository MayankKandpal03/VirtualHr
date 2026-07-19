import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["pdf", "png", "jpg", "jpeg"], // no docx for now — see note on mammoth in the message
      required: true,
    },
    // no fileUrl yet — files aren't persisted anywhere (no Cloudinary/S3 wired up),
    // left here so adding storage later is a code change, not a schema migration
    fileUrl: { type: String },

    // extracted by Gemini
    name: { type: String },
    email: { type: String },
    phone: { type: String },
    experienceYears: { type: Number },
    qualification: { type: String },
    matchedSkills: [{ type: String }],
    additionalSkills: [{ type: String }],
    projects: [{ type: String }],

    subScores: {
      skillMatch: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
      expertise: { type: Number, default: 0 },
      qualification: { type: Number, default: 0 },
    },
    finalScore: { type: Number, default: 0 }, // computed server-side, never trusted from Gemini directly

    whyChoose: { type: String },
    lacking: [{ type: String }],
    redFlags: [{ type: String }],
    greenFlags: [{ type: String }],
    summary: { type: String },

    // human-in-the-loop
    hrNotes: { type: String },
    excluded: { type: Boolean, default: false },
    manualScoreOverride: { type: Number },

    status: {
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending",
    },
    processingError: { type: String },
  },
  { timestamps: true },
);

candidateSchema.index({ jobId: 1, finalScore: -1 }); // fast "top N by score" queries

const Candidate = mongoose.model("Candidate", candidateSchema);
export default Candidate;
