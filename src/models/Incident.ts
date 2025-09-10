// models/Incident.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IIncident extends Document {
  incidentId: string; // FIR-YYYY-XXXXXX format
  touristId: mongoose.Types.ObjectId;
  
  // Incident Details
  type: 'theft' | 'assault' | 'fraud' | 'harassment' | 'medical' | 'accident' | 'missing' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  
  // Location Information
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    landmark?: string;
    city?: string;
    state?: string;
  };
  
  // Incident Information
  dateTime: Date;
  description: string;
  witnesses?: string[];
  
  // Evidence
  evidenceFiles: string[]; // URLs to uploaded files
  evidenceCID?: string; // IPFS hash for blockchain storage
  
  // Police/Official Response
  assignedOfficer?: {
    name: string;
    badgeNumber: string;
    station: string;
    contactNumber: string;
  };
  
  policeStation?: {
    name: string;
    address: string;
    contactNumber: string;
  };
  
  // e-FIR Data
  firNumber?: string;
  firDate?: Date;
  firStatus: 'pending' | 'filed' | 'under_investigation' | 'closed';
  
  // Blockchain Integration
  onchainTxHash?: string;
  onchainStatus: 'pending' | 'submitted' | 'confirmed' | 'failed';
  
  // Follow-up Actions
  actions: Array<{
    actionType: 'police_assigned' | 'evidence_collected' | 'statement_recorded' | 'fir_filed' | 'case_closed';
    description: string;
    takenBy: string; // Officer/Admin name
    timestamp: Date;
  }>;
  
  // Contact Information
  reportedBy: {
    name: string;
    phoneNumber: string;
    email?: string;
    relationship?: 'self' | 'family' | 'friend' | 'witness' | 'authority';
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    incidentId: { 
      type: String, 
      unique: true, 
      required: true 
    },
    touristId: { 
      type: Schema.Types.ObjectId, 
      ref: "Tourist", 
      required: true 
    },
    
    // Incident Details
    type: {
      type: String,
      enum: ['theft', 'assault', 'fraud', 'harassment', 'medical', 'accident', 'missing', 'other'],
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['reported', 'investigating', 'resolved', 'closed'],
      default: 'reported'
    },
    
    // Location Information
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: String,
      landmark: String,
      city: String,
      state: String
    },
    
    // Incident Information
    dateTime: { type: Date, required: true },
    description: { type: String, required: true },
    witnesses: [String],
    
    // Evidence
    evidenceFiles: [String],
    evidenceCID: String,
    
    // Police/Official Response
    assignedOfficer: {
      name: String,
      badgeNumber: String,
      station: String,
      contactNumber: String
    },
    
    policeStation: {
      name: String,
      address: String,
      contactNumber: String
    },
    
    // e-FIR Data
    firNumber: String,
    firDate: Date,
    firStatus: {
      type: String,
      enum: ['pending', 'filed', 'under_investigation', 'closed'],
      default: 'pending'
    },
    
    // Blockchain Integration
    onchainTxHash: String,
    onchainStatus: {
      type: String,
      enum: ['pending', 'submitted', 'confirmed', 'failed'],
      default: 'pending'
    },
    
    // Follow-up Actions
    actions: [{
      actionType: {
        type: String,
        enum: ['police_assigned', 'evidence_collected', 'statement_recorded', 'fir_filed', 'case_closed'],
        required: true
      },
      description: String,
      takenBy: String,
      timestamp: { type: Date, default: Date.now }
    }],
    
    // Contact Information
    reportedBy: {
      name: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      email: String,
      relationship: {
        type: String,
        enum: ['self', 'family', 'friend', 'witness', 'authority'],
        default: 'self'
      }
    }
  },
  { timestamps: true }
);

// Indexes for efficient querying
IncidentSchema.index({ touristId: 1 });
IncidentSchema.index({ incidentId: 1 });
IncidentSchema.index({ status: 1 });
IncidentSchema.index({ severity: 1 });
IncidentSchema.index({ type: 1 });
IncidentSchema.index({ firStatus: 1 });
IncidentSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
IncidentSchema.index({ createdAt: -1 });

export default mongoose.model<IIncident>("Incident", IncidentSchema);
