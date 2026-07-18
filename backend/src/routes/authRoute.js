import { registrationController } from "../controllers/authController.js";
import { Router } from "express";

const router = Router();

router.post("/register", registrationController);

export default router;
