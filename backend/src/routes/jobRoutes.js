import { Router } from "express";
import protect from "../middleware/protect.js";
import {
  createJobController,
  getJobsController,
  getJobByIdController,
  updateScoringWeightsController,
} from "../controllers/jobController.js";

const router = Router();

router.use(protect); // every job route requires a logged-in HR user

router.post("/", createJobController);
router.get("/", getJobsController);
router.get("/:jobId", getJobByIdController);
router.patch("/:jobId/scoring-weights", updateScoringWeightsController);

export default router;
