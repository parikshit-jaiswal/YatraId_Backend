import mongoose, { Schema, Document } from "mongoose";

export interface ILocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface ILocation extends Document {
  touristId: string; // Tourist ID who is sharing location
  userId: mongoose.Types.ObjectId; // User ID for the tourist
  
  // Current location data
  currentLocation: ILocationData;
  
  // Location sharing settings
  isSharing: boolean; // Whether user is currently sharing location
  shareWithFamily: boolean; // Share with family members
  shareWithEmergency: boolean; // Share during emergencies/SOS
  
  // Location history (last 10 locations for tracking movement)
  locationHistory: ILocationData[];
  
  // Battery and performance optimization
  lastMovement: Date; // When user last moved significantly
  movementThreshold: number; // Meters before updating location (default: 25m)
  updateInterval: number; // Seconds between updates (default: 10s)
  
  // Privacy and security
  sharedWith: Array<{
    touristId: string; // Who can see this location
    permission: "family" | "emergency" | "temporary";
    grantedAt: Date;
    expiresAt?: Date; // For temporary sharing
  }>;
  
  // Geofencing and safety
  safeZones: Array<{
    name: string;
    latitude: number;
    longitude: number;
    radius: number; // meters
    isActive: boolean;
  }>;
  
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;

  // Method definitions
  isLocationSignificantlyDifferent(): boolean;
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
  isInSafeZone(): boolean;
}

const LocationDataSchema = new Schema<ILocationData>({
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  accuracy: { type: Number, min: 0 }, // meters
  altitude: { type: Number },
  heading: { type: Number, min: 0, max: 360 }, // degrees
  speed: { type: Number, min: 0 }, // m/s
  timestamp: { type: Date, required: true, default: Date.now }
}, { _id: false });

const LocationSchema = new Schema<ILocation>(
  {
    touristId: { 
      type: String, 
      required: true, 
      unique: true,
      ref: "Tourist"
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    
    currentLocation: {
      type: LocationDataSchema,
      required: true
    },
    
    // Sharing settings
    isSharing: { type: Boolean, default: false },
    shareWithFamily: { type: Boolean, default: true },
    shareWithEmergency: { type: Boolean, default: true },
    
    // Location history (limit to last 10 positions)
    locationHistory: {
      type: [LocationDataSchema],
      default: [],
      validate: {
        validator: function(arr: ILocationData[]) {
          return arr.length <= 10;
        },
        message: "Location history cannot exceed 10 entries"
      }
    },
    
    // Movement tracking
    lastMovement: { type: Date, default: Date.now },
    movementThreshold: { type: Number, default: 25 }, // 25 meters
    updateInterval: { type: Number, default: 10 }, // 10 seconds
    
    // Permission management
    sharedWith: [{
      touristId: { type: String, required: true },
      permission: {
        type: String,
        enum: ["family", "emergency", "temporary"],
        required: true
      },
      grantedAt: { type: Date, default: Date.now },
      expiresAt: Date
    }],
    
    // Safety zones
    safeZones: [{
      name: { type: String, required: true },
      latitude: { type: Number, required: true, min: -90, max: 90 },
      longitude: { type: Number, required: true, min: -180, max: 180 },
      radius: { type: Number, required: true, min: 1 }, // meters
      isActive: { type: Boolean, default: true }
    }],
    
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Indexes for efficient querying
LocationSchema.index({ touristId: 1 });
LocationSchema.index({ userId: 1 });
LocationSchema.index({ "sharedWith.touristId": 1 });
LocationSchema.index({ lastUpdated: 1 });
LocationSchema.index({ isSharing: 1 });

// Geospatial index for location-based queries
LocationSchema.index({ 
  "currentLocation.latitude": 1, 
  "currentLocation.longitude": 1 
});

// TTL index to automatically delete inactive location records after 30 days
LocationSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Pre-save middleware to manage location history
LocationSchema.pre<ILocation>('save', function(next) {
  // Update lastUpdated when location changes
  this.lastUpdated = new Date();
  
  // Manage location history - keep only last 10 locations
  if (this.locationHistory.length >= 10) {
    this.locationHistory = this.locationHistory.slice(-9); // Keep last 9
  }
  
  // Add current location to history if it's significantly different
  if (this.locationHistory.length === 0 || this.isLocationSignificantlyDifferent()) {
    this.locationHistory.push(this.currentLocation);
  }
  
  next();
});

// Method to check if location has moved significantly
LocationSchema.methods.isLocationSignificantlyDifferent = function(): boolean {
  if (this.locationHistory.length === 0) return true;
  
  const lastLocation = this.locationHistory[this.locationHistory.length - 1];
  const distance = this.calculateDistance(
    lastLocation.latitude,
    lastLocation.longitude,
    this.currentLocation.latitude,
    this.currentLocation.longitude
  );
  
  return distance >= this.movementThreshold;
};

// Method to calculate distance between two points (Haversine formula)
LocationSchema.methods.calculateDistance = function(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
};

// Method to check if location is in any safe zone
LocationSchema.methods.isInSafeZone = function(): boolean {
  return this.safeZones.some((zone: any) => {
    if (!zone.isActive) return false;
    const distance = this.calculateDistance(
      zone.latitude,
      zone.longitude,
      this.currentLocation.latitude,
      this.currentLocation.longitude
    );
    return distance <= zone.radius;
  });
};

export default mongoose.model<ILocation>("Location", LocationSchema);
