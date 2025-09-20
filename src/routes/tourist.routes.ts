import { Router } from "express";
import { 
  registerTourist,
  getTourist,
  updateTourist,
  raisePanic,
  updateSafetyScore,
  getAllTourists,
  getDashboard,
  uploadProfileImage,
  // Admin endpoints
  searchTouristById,
  getHeatMapData,
  getSOSAlerts,
  createRestrictedZone,
  getTouristAnalytics,
  updateRiskScore,
  generateQRCode,
  getRestrictedZones,
  deleteRestrictedZone,
  updateRestrictedZone,
  // New panic management endpoints
  // updatePanicStatus,
  // getPanicDetails
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

// Profile image upload route
router.route('/profile-image').post(
  verifyJWT, 
  uploadProfilePicture.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'profilePicture', maxCount: 1 }
  ]),
  uploadProfileImage
);

// ============= ADMIN ROUTES =============
// Search and management
router.route('/admin/search').get(verifyJWT, searchTouristById);
router.route('/admin/analytics').get(verifyJWT, getTouristAnalytics);

// Heat maps and SOS monitoring  
router.route('/admin/heatmap').get(verifyJWT, getHeatMapData);
router.route('/admin/sos-alerts').get(verifyJWT, getSOSAlerts);

// ============= NEW PANIC MANAGEMENT ROUTES =============
// router.route('/admin/panic/:panicId').get(verifyJWT, getPanicDetails);
// router.route('/admin/panic/:panicId/status').put(verifyJWT, updatePanicStatus);

// Restricted zones management
router.route('/admin/restricted-zones').post(verifyJWT, createRestrictedZone);
router.route('/admin/restricted-zones').get(getRestrictedZones);
router.route('/admin/restricted-zones/:id').delete(verifyJWT, deleteRestrictedZone);
router.route('/admin/restricted-zones/:id').put(verifyJWT, updateRestrictedZone);

// AI and risk scoring
router.route('/admin/risk-score').post(verifyJWT, updateRiskScore);

// QR code generation for verified tourists
router.route('/admin/qr-code/:touristId').post(verifyJWT, generateQRCode);

export default router;