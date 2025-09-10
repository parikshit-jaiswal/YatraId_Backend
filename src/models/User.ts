import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  profileCompleted?: boolean;
  walletAddress?: string;
  encryptedPrivateKey?: string; // Custodial wallet
  walletGenerated?: boolean;
  kycStatus?: "pending" | "verified" | "failed";
  kycType?: "indian" | "international";
  isAdmin?: boolean;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    profileCompleted: { type: Boolean, default: false },
    walletAddress: { 
      type: String, 
      unique: true, 
      sparse: true 
      // REMOVED: index: true to avoid duplicate with schema.index() below
    },
    encryptedPrivateKey: { type: String }, // Store encrypted private key 
    walletGenerated: { type: Boolean, default: false },
    kycStatus: { 
      type: String, 
      enum: ["pending", "verified", "failed"], 
      default: "pending" 
    },
    kycType: { type: String, enum: ["indian", "international"] },
    isAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// KEEP only this index definition
UserSchema.index({ walletAddress: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);