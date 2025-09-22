import { Router } from "express";
import { 
  // Original location controllers
  updateLocation,
  getFamilyLocations,
  getTouristLocation,
  toggleLocationSharing,
  getLocationSettings,
  updateLocationSettings,
  emergencyLocationBroadcast,
  getLocationUpdates
} from "../controllers/location.controllers";

import {
  // New socket-enabled controllers
  updateLocationWithSocket,
  getFamilyLocationsWithSocket,
  emergencyLocationBroadcastWithSocket,
  getRealtimeStatus
} from "../controllers/location.socket.controllers";

import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyJWT);

// ==================== REAL-TIME SOCKET ROUTES ====================

// POST /api/locations/realtime/update - Update location with real-time socket notifications
router.post("/realtime/update", updateLocationWithSocket);

// GET /api/locations/realtime/family - Get family locations with real-time data
router.get("/realtime/family", getFamilyLocationsWithSocket);

// POST /api/locations/realtime/emergency - Emergency SOS with real-time notifications
router.post("/realtime/emergency", emergencyLocationBroadcastWithSocket);

// GET /api/locations/realtime/status - Get real-time connection status
router.get("/realtime/status", getRealtimeStatus);

// ==================== TRADITIONAL REST ROUTES ====================

// POST /api/locations/update - Update current user's live location (traditional)
router.post("/update", updateLocation);

// GET /api/locations/family - Get all family members' live locations (traditional)
router.get("/family", getFamilyLocations);

// GET /api/locations/tourist/:touristId - Get specific tourist's location (if permitted)
router.get("/tourist/:touristId", getTouristLocation);

// GET /api/locations/updates - Get real-time location updates for polling
router.get("/updates", getLocationUpdates);

// ==================== LOCATION SHARING SETTINGS ====================

// POST /api/locations/toggle - Toggle location sharing on/off
router.post("/toggle", toggleLocationSharing);

// GET /api/locations/settings - Get current location sharing settings
router.get("/settings", getLocationSettings);

// PUT /api/locations/settings - Update location sharing preferences
router.put("/settings", updateLocationSettings);

// ==================== EMERGENCY LOCATION ====================

// POST /api/locations/emergency - Emergency SOS location broadcast (traditional)
router.post("/emergency", emergencyLocationBroadcast);

export default router;