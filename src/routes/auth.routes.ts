import { Router } from "express";
import {
  registerUserWithTouristAndKYC,
  verifyCombinedRegistration,
  loginController,
  googleLoginController,
  logoutController,
} from "../controllers/auth.controllers";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();

// New combined registration flow
router.route("/register-with-kyc").post(registerUserWithTouristAndKYC);
router.route("/verify-combined-registration").post(verifyCombinedRegistration);

// Authentication routes
router.route("/login").post(loginController);
router.route("/google-login").post(googleLoginController);
router.route("/logout").post(verifyJWT, logoutController);

export default router;