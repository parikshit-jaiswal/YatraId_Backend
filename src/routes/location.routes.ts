import { Router } from "express";
import { 
  updateLocation,
  getFamilyLocations,
  getTouristLocation,
  toggleLocationSharing,
  getLocationSettings,
  updateLocationSettings,
  emergencyLocationBroadcast,
  getLocationUpdates
} from "../controllers/location.controllers";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// ==================== LIVE LOCATION ROUTES ====================

// POST /api/locations/update - Update current user's live location
// Body: { latitude, longitude, accuracy?, altitude?, heading?, speed?, isSharing?, shareWithFamily? }
router.post("/update", updateLocation);

// GET /api/locations/family - Get all family members' live locations (for map display)
// Returns: Array of family member locations with Google Maps marker format
router.get("/family", getFamilyLocations);

// GET /api/locations/tourist/:touristId - Get specific tourist's location (if permitted)
// Returns: Single tourist location with history
router.get("/tourist/:touristId", getTouristLocation);

// GET /api/locations/updates - Get real-time location updates for polling
// Query: ?since=2024-01-01T12:00:00Z (optional)
// Returns: Only locations updated since specified time
router.get("/updates", getLocationUpdates);

// ==================== LOCATION SHARING SETTINGS ====================

// POST /api/locations/toggle - Toggle location sharing on/off
// Body: { isSharing, shareWithFamily }
router.post("/toggle", toggleLocationSharing);

// GET /api/locations/settings - Get current location sharing settings
// Returns: User's location sharing preferences and status
router.get("/settings", getLocationSettings);

// PUT /api/locations/settings - Update location sharing preferences
// Body: { updateInterval?, movementThreshold?, shareWithFamily?, isSharing? }
router.put("/settings", updateLocationSettings);

// ==================== EMERGENCY LOCATION ====================

// POST /api/locations/emergency - Emergency SOS location broadcast
// Body: { latitude, longitude, accuracy?, message? }
// Forces location sharing and notifies all family members
router.post("/emergency", emergencyLocationBroadcast);

export default router;
