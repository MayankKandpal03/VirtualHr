import { loginController, registrationController, tokenRefreshController } from "../controllers/authController.js";
import { Router } from "express";

const router = Router();

router.post("/register", registrationController);
router.post("/refresh-token", tokenRefreshController)
router.post("/login", loginController)
export default router;
