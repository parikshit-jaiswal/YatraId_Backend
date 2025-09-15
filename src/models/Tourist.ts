// models/Tourist.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IKyc {
  method: "digilocker" | "passport" | "pending";
  status: "pending" | "verified" | "failed";
  data: {
    // Common fields
    fullName?: string;
    phoneNumber?: string;
    dateOfBirth?: Date;
    address?: string;

    // Indian Tourist
    aadhaarNumber?: string;

    // International Tourist
    passportNumber?: string;
    nationality?: string;
    passportExpiryDate?: Date;
  };
}

export interface ITourist extends Document {
  userId: mongoose.Types.ObjectId;

  // Basic Info (collected during registration)
  fullName: string;
  phoneNumber: string;
  profileImage?: string;
  dateOfBirth?: Date;
  nationality: "indian" | "international" | "pending";

  // Unique Tourist ID (generated after KYC verification)
  touristId?: string; // Human-readable ID like "TID-IND-2024-001234"
  qrCodeData?: string; // QR code for scanning at hotels/checkpoints

  // Blockchain & Storage
  touristIdOnChain: string;
  ownerWallet: string;
  kycCID: string;
  kyc: IKyc;
  emergencyCID: string;

  // Validity & Permissions
  validUntil: Date;
  trackingOptIn: boolean;
  isActive: boolean; // Can use tourist services

  // Emergency & Safety
  panics: Array<{
    location: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    timestamp: Date;
    evidenceCID: string;
    onchainStatus: "pending" | "submitted" | "confirmed" | "failed";
  }>;

  // Family Relationships (reverse lookup)
  familyConnections: Array<{
    familyId: string; // Primary tourist's touristId who added this tourist
    relationship: "parent" | "spouse" | "child" | "sibling" | "guardian" | "other";
    addedAt: Date;
  }>;

  // Blockchain Transactions
  onchainTxs: Array<{
    action: "register" | "update" | "panic" | "score" | "verify_kyc";
    status: "pending" | "submitted" | "confirmed" | "failed";
    txHash?: string;
    cid: string;
    createdAt: Date;
    updatedAt?: Date;
    error?: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const TouristSchema = new Schema<ITourist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Basic Info
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    profileImage:{ type: String },
    dateOfBirth: { type: Date },
    nationality: {
      type: String,
      enum: ["indian", "international", "pending"],
      default: "pending",
    },

    // Unique Tourist ID (generated after KYC) - REMOVED index: true
    touristId: { type: String, unique: true, sparse: true },
    qrCodeData: { type: String },

    // Blockchain & Storage - REMOVED index: true
    touristIdOnChain: { type: String, unique: true, sparse: true },
    ownerWallet: {
      type: String,
      required: true,
      validate: {
        validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
        message: "Invalid Ethereum address",
      },
    },
    kycCID: { type: String, required: true },
    kyc: {
      method: {
        type: String,
        enum: ["digilocker", "passport", "pending"],
        default: "pending",
      },
      status: {
        type: String,
        enum: ["pending", "verified", "failed"],
        default: "pending",
      },
      data: {
        fullName: String,
        phoneNumber: String,
        dateOfBirth: Date,
        address: String,
        aadhaarNumber: String,
        passportNumber: String,
        nationality: String,
        passportExpiryDate: Date,
      },
    },
    emergencyCID: { type: String, required: true },

    // Validity & Permissions
    validUntil: { type: Date, required: true },
    trackingOptIn: { type: Boolean, default: false },
    isActive: { type: Boolean, default: false }, // Active after KYC verification

    // Emergency & Safety
    panics: [
      {
        location: {
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
          address: String,
        },
        timestamp: { type: Date, default: Date.now },
        evidenceCID: String,
        onchainStatus: {
          type: String,
          enum: ["pending", "submitted", "confirmed", "failed"],
          default: "pending",
        },
      },
    ],

    // Family Relationships (reverse lookup)
    familyConnections: [
      {
        familyId: { type: String, required: true },
        relationship: {
          type: String,
          enum: ["parent", "spouse", "child", "sibling", "guardian", "other"],
          required: true
        },
        addedAt: { type: Date, default: Date.now }
      }
    ],

    // Blockchain Transactions
    onchainTxs: [
      {
        action: {
          type: String,
          enum: ["register", "update", "panic", "score", "verify_kyc"],
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "submitted", "confirmed", "failed"],
          default: "pending",
        },
        txHash: String,
        cid: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: Date,
        error: String,
      },
    ],
  },
  { timestamps: true }
);

// KEEP only these index definitions (remove duplicates)
TouristSchema.index({ userId: 1 });
TouristSchema.index({ touristId: 1 });
TouristSchema.index({ touristIdOnChain: 1 });
TouristSchema.index({ ownerWallet: 1 });
TouristSchema.index({ phoneNumber: 1 });
TouristSchema.index({ "kyc.status": 1 });
TouristSchema.index({ isActive: 1 });
TouristSchema.index({ "familyConnections.familyId": 1 });

export default mongoose.model<ITourist>("Tourist", TouristSchema);
