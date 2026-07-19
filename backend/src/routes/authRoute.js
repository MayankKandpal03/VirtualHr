import {
  loginController,
  registrationController,
  tokenRefreshController,
  logoutController,
} from "../controllers/authController.js";
import protect from "../middleware/protect.js";
import { Router } from "express";

const router = Router();

router.post("/register", registrationController);
router.post("/login", loginController);
router.post("/refresh-token", tokenRefreshController); // no protect() here — this route IS how you recover from an expired access token
router.post("/logout", protect, logoutController);

export default router;
