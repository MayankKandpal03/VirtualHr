import { Router } from "express";
import protect from "../middleware/protect.js";
import { sendBulkEmailsController } from "../controllers/emailController.js";

const router = Router();
router.use(protect);

router.post("/:jobId/send", sendBulkEmailsController);

export default router;
