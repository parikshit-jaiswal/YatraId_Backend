import { Router } from "express";
import {
  registerUserWithTouristAndKYC,
  verifyCombinedRegistration,
  loginController,
  googleLoginController,
} from "../controllers/auth.controllers";

const router = Router();

// New combined registration flow
router.route("/register-with-kyc").post(registerUserWithTouristAndKYC);
router.route("/verify-combined-registration").post(verifyCombinedRegistration);

// Existing routes
router.route("/login").post(loginController);
router.route("/google-login").post(googleLoginController);

export default router;