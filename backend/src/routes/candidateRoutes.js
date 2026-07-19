import { Router } from "express";
import protect from "../middleware/protect.js";
import { upload } from "../services/candidateService.js";
import {
  uploadCandidatesController,
  getCandidatesController,
  getCandidateByIdController,
  updateCandidateController,
} from "../controllers/candidateController.js";

const router = Router();
router.use(protect);

router.post("/:jobId/upload", upload.array("resumes", 50), uploadCandidatesController);
router.get("/:jobId", getCandidatesController);
router.get("/:jobId/:candidateId", getCandidateByIdController);
router.patch("/:jobId/:candidateId", updateCandidateController);

export default router;
