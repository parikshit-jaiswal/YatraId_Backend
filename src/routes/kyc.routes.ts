import { Router } from "express";
import { 
  initiateIndianKyc,
  verifyOtpAndCompleteKyc,
  initiateInternationalKyc,
  verifyInternationalOtp,
  getKycStatus,
  retryKyc
} from "../controllers/kycController";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();

// Indian KYC routes
router.route('/indian/initiate').post(verifyJWT, initiateIndianKyc);
router.route('/indian/verify-otp').post(verifyJWT, verifyOtpAndCompleteKyc);

// International KYC routes  
router.route('/international/initiate').post(verifyJWT, initiateInternationalKyc);
router.route('/international/verify-otp').post(verifyJWT, verifyInternationalOtp);

// Common KYC routes
router.route('/status').get(verifyJWT, getKycStatus);
router.route('/retry').post(verifyJWT, retryKyc);

export default router;