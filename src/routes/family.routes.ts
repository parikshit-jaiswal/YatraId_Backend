import express from "express";
import {
  createFamily,
  addFamilyMember,
  removeFamilyMember,
  getFamily,
  updateFamilySettings,
  updateFamilyMember,
  getFamiliesAsMember,
  searchTouristForFamily
} from "../controllers/family.controllers";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = express.Router();

// All family routes require authentication
router.use(verifyJWT);

// Family management routes
router.post("/create", createFamily);
router.get("/", getFamily);
router.put("/settings", updateFamilySettings);

// Family member management
router.post("/members", addFamilyMember);
router.delete("/members/:touristId", removeFamilyMember);
router.put("/members/:touristId", updateFamilyMember);

// Additional family features
router.get("/as-member", getFamiliesAsMember);
router.get("/search/:touristId", searchTouristForFamily);

export default router;
