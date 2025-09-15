import mongoose, { Schema, Document } from "mongoose";

export interface IFamilyMember {
  touristId: string;
  fullName: string;
  relationship: "parent" | "spouse" | "child" | "sibling" | "guardian" | "other";
  phoneNumber?: string;
  emergencyContact?: boolean;
  addedAt: Date;
}

export interface IFamily extends Document {
  primaryTouristId: string; // The tourist who created this family group
  primaryUserId: mongoose.Types.ObjectId;
  familyName?: string; // Optional family name
  members: IFamilyMember[];
  
  // Family settings
  shareLocation: boolean; // Allow family members to see each other's location
  emergencyNotifications: boolean; // Send notifications for family emergencies
  
  createdAt: Date;
  updatedAt: Date;
}

const FamilySchema = new Schema<IFamily>(
  {
    primaryTouristId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    primaryUserId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    familyName: { 
      type: String, 
      trim: true 
    },
    members: [{
      touristId: { 
        type: String, 
        required: true 
      },
      fullName: { 
        type: String, 
        required: true, 
        trim: true 
      },
      relationship: {
        type: String,
        enum: ["parent", "spouse", "child", "sibling", "guardian", "other"],
        required: true
      },
      phoneNumber: { 
        type: String, 
        trim: true 
      },
      emergencyContact: { 
        type: Boolean, 
        default: false 
      },
      addedAt: { 
        type: Date, 
        default: Date.now 
      }
    }],
    shareLocation: { 
      type: Boolean, 
      default: true 
    },
    emergencyNotifications: { 
      type: Boolean, 
      default: true 
    }
  },
  { timestamps: true }
);

// Indexes for efficient querying
FamilySchema.index({ primaryTouristId: 1 });
FamilySchema.index({ primaryUserId: 1 });
FamilySchema.index({ "members.touristId": 1 });

// Prevent duplicate family members
FamilySchema.index(
  { primaryTouristId: 1, "members.touristId": 1 }, 
  { unique: true, sparse: true }
);

export default mongoose.model<IFamily>("Family", FamilySchema);
