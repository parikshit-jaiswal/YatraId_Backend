import { Schema, model } from "mongoose";

const RestrictedZoneSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  coordinates: [
    {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  ],
  severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default model("RestrictedZone", RestrictedZoneSchema);