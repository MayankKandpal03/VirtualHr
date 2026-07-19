import { GoogleGenAI, Type } from "@google/genai";
import { AppError } from "../utils/appError.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Written directly in the SDK's schema format instead of zod + zod-to-json-schema —
// one less dependency, and this shape doesn't change often enough to need a validation library on top.
const candidateAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    email: { type: Type.STRING },
    phone: { type: Type.STRING },
    experienceYears: { type: Type.NUMBER },
    qualification: { type: Type.STRING },
    matchedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    additionalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    projects: { type: Type.ARRAY, items: { type: Type.STRING } },
    subScores: {
      type: Type.OBJECT,
      properties: {
        skillMatch: { type: Type.NUMBER },
        experience: { type: Type.NUMBER },
        expertise: { type: Type.NUMBER },
        qualification: { type: Type.NUMBER },
      },
      required: ["skillMatch", "experience", "expertise", "qualification"],
    },
    whyChoose: { type: Type.STRING }, // 2-3 sentences on why this candidate fits
    lacking: { type: Type.ARRAY, items: { type: Type.STRING } }, // what's missing vs. the JD
    redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    greenFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: { type: Type.STRING },
  },
  required: [
    "name",
    "experienceYears",
    "matchedSkills",
    "additionalSkills",
    "subScores",
    "whyChoose",
    "lacking",
    "summary",
  ],
};

const buildPrompt = (job) => `
You are an expert technical recruiter assistant. You'll be given one job's
requirements and one candidate's resume (attached). Extract structured
information and evaluate fit objectively, based only on evidence in the
resume. Do not assume anything not stated in the document.

JOB REQUIREMENTS
Title: ${job.title}
Description: ${job.description}
Required skills: ${(job.requiredSkills || []).join(", ") || "not specified"}
Experience required: ${job.experienceRequired?.min ?? 0}-${job.experienceRequired?.max ?? "any"} years
Qualification required: ${job.qualification || "not specified"}
Other requirements: ${job.otherRequirements || "none"}

Score each of skillMatch, experience, expertise, and qualification from 0-100.
For "expertise", weigh project depth, technologies used, complexity, and any
quantified impact — not years of experience, which is scored separately under
"experience". List concrete evidence in "whyChoose" and "lacking" so a human
reviewer can verify your reasoning rather than trust a bare number.

Return ONLY JSON matching the provided schema.
`;

// One resume per call — no batching multiple resumes into a single request.
// A single malformed field breaks parsing for that one candidate only, not the whole set.
export const analyzeResume = async (job, fileBuffer, mimeType) => {
  const parts = [
    { text: buildPrompt(job) },
    { inlineData: { data: fileBuffer.toString("base64"), mimeType } }, // native vision for pdf/image — no OCR step
  ];

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-flash-latest", // cheap + fast for extraction; swap to a pro-tier model per-job later if needed
      contents: parts,
      config: {
        responseMimeType: "application/json",
        responseSchema: candidateAnalysisSchema,
      },
    });
  } catch (err) {
    throw new AppError(502, "Gemini request failed", [err.message]);
  }

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new AppError(502, "Gemini returned malformed JSON");
  }

  // Manual required-field check, matching the missingFields pattern already used
  // in authService — no zod needed for a shape this small.
  const missing = [];
  if (!parsed.name) missing.push("name");
  if (!parsed.subScores) missing.push("subScores");
  if (!parsed.summary) missing.push("summary");
  if (missing.length) {
    throw new AppError(502, "Gemini response missing required fields", missing);
  }

  return parsed;
};
