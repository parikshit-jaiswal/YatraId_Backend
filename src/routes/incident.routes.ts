// routes/incident.routes.ts
import { Router } from "express";
import { 
  reportIncident,
  getIncident,
  updateIncidentStatus,
  getAllIncidents,
  generateFIR,
  getIncidentStats
} from "../controllers/incidentController"; 
import { verifyJWT } from "../middlewares/auth.middleware"; 

const router = Router();

// Incident reporting and management
router.route('/report').post(verifyJWT, reportIncident);
router.route('/:incidentId').get(verifyJWT, getIncident);

// Admin routes for incident management
router.route('/admin/').get(verifyJWT, getAllIncidents);
router.route('/admin/:incidentId/status').put(verifyJWT, updateIncidentStatus);
router.route('/admin/:incidentId/fir').post(verifyJWT, generateFIR);
router.route('/admin/statistics').get(verifyJWT, getIncidentStats);

export default router;
