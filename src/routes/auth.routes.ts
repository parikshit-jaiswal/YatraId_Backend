import express from "express";
import {
  registerController,
  loginController,
  googleLoginController,
  verifyRegistrationOTP,

} from "../controllers/auth.controllers";

const router = express.Router();

router.post("/register", registerController);
router.post("/verify-otp", verifyRegistrationOTP);
router.post("/login", loginController);
router.post("/google-login", googleLoginController);

export default router;