import { registrationController, tokenRefreshController } from "../controllers/authController.js";
import { Router } from "express";

const router = Router();

router.post("/register", registrationController);
router.post("/refresh-token", tokenRefreshController)
export default router;
