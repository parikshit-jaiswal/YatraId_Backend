import { Router } from "express";
import { 
  registerTourist,
  getTourist,
  updateTourist,
  raisePanic,
  updateSafetyScore,
  getAllTourists,
  getDashboard,
  uploadProfileImage
} from "../controllers/touristcontroller"; 
import { verifyJWT } from "../middlewares/auth.middleware"; 
import { uploadProfilePicture } from "../middlewares/upload.middleware"; 

const router = Router();

// Tourist registration and management routes
router.route('/register').post(verifyJWT, registerTourist);
router.route('/dashboard').get(verifyJWT, getDashboard);
router.route('/').get(verifyJWT, getAllTourists);
router.route('/:id').get(verifyJWT, getTourist);
router.route('/:id').put(verifyJWT, updateTourist);

// Emergency and safety routes
router.route('/:id/panic').post(verifyJWT, raisePanic);
router.route('/:id/safety-score').post(verifyJWT, updateSafetyScore);

// Profile image upload route - FIXED: Accept both field names
router.route('/profile-image').post(
  verifyJWT, 
  uploadProfilePicture.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 }
  ]),
  uploadProfileImage
);

export default router;