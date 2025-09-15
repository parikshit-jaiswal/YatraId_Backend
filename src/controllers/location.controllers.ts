import { Request, Response } from "express";
import Location from "../models/Location";
import Tourist from "../models/Tourist";
import Family from "../models/Family";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

// Update current user's location (for live tracking)
export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  const { 
    latitude, 
    longitude, 
    accuracy, 
    altitude, 
    heading, 
    speed,
    isSharing = true,
    shareWithFamily = true 
  } = req.body;

  // Validation
  if (!latitude || !longitude) {
    throw new ApiError(400, "Latitude and longitude are required");
  }

  if (latitude < -90 || latitude > 90) {
    throw new ApiError(400, "Invalid latitude value");
  }

  if (longitude < -180 || longitude > 180) {
    throw new ApiError(400, "Invalid longitude value");
  }

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(404, "Tourist profile not found");
  }

  const locationData = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    accuracy: accuracy ? parseFloat(accuracy) : undefined,
    altitude: altitude ? parseFloat(altitude) : undefined,
    heading: heading ? parseFloat(heading) : undefined,
    speed: speed ? parseFloat(speed) : undefined,
    timestamp: new Date()
  };

  // Check if location record exists for this tourist
  let locationRecord = await Location.findOne({ touristId: currentTourist.touristId });

  if (locationRecord) {
    // Update existing location
    locationRecord.currentLocation = locationData;
    locationRecord.isSharing = isSharing;
    locationRecord.shareWithFamily = shareWithFamily;
    locationRecord.lastMovement = new Date();
    
    await locationRecord.save();
  } else {
    // Create new location record
    locationRecord = new Location({
      touristId: currentTourist.touristId,
      userId: req.user?._id,
      currentLocation: locationData,
      isSharing,
      shareWithFamily,
      lastMovement: new Date(),
      sharedWith: [] // Will be populated when family members request access
    });
    
    await locationRecord.save();
  }

  // If sharing with family, automatically grant permission to family members
  if (shareWithFamily) {
    await updateFamilyLocationPermissions(currentTourist.touristId);
  }

  return res.status(200).json(
    new ApiResponse(200, {
      touristId: currentTourist.touristId,
      location: locationRecord.currentLocation,
      isSharing: locationRecord.isSharing,
      lastUpdated: locationRecord.lastUpdated
    }, "Location updated successfully")
  );
});

// Get family members' live locations
export const getFamilyLocations = asyncHandler(async (req: Request, res: Response) => {
  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(404, "Tourist profile not found");
  }

  // Get family where current user is primary
  const family = await Family.findOne({ primaryTouristId: currentTourist.touristId });
  
  // Get families where current user is a member
  const memberFamilies = await Family.find({
    "members.touristId": currentTourist.touristId
  });

  // Collect all family member tourist IDs
  const familyTouristIds: string[] = [];

  // Add members from user's own family
  if (family) {
    familyTouristIds.push(...family.members.map(member => member.touristId));
  }

  // Add primary tourist from families where current user is a member
  memberFamilies.forEach(memberFamily => {
    if (!familyTouristIds.includes(memberFamily.primaryTouristId)) {
      familyTouristIds.push(memberFamily.primaryTouristId);
    }
    // Also add other members from these families
    memberFamily.members.forEach(member => {
      if (member.touristId !== currentTourist.touristId && !familyTouristIds.includes(member.touristId)) {
        familyTouristIds.push(member.touristId);
      }
    });
  });

  if (familyTouristIds.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, [], "No family members found")
    );
  }

  // Get locations for all family members who are sharing
  const familyLocations = await Location.find({
    touristId: { $in: familyTouristIds },
    isSharing: true,
    shareWithFamily: true,
    lastUpdated: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
  }).populate({
    path: 'userId',
    select: 'name email'
  });

  // Get tourist details for the locations
  const touristDetails = await Tourist.find({
    touristId: { $in: familyLocations.map(loc => loc.touristId) }
  }).select('touristId fullName phoneNumber profileImage');

  // Combine location data with tourist details
  const enrichedLocations = familyLocations.map(location => {
    const tourist = touristDetails.find(t => t.touristId === location.touristId);
    return {
      touristId: location.touristId,
      touristName: tourist?.fullName || 'Unknown',
      profileImage: tourist?.profileImage,
      phoneNumber: tourist?.phoneNumber,
      location: location.currentLocation,
      lastUpdated: location.lastUpdated,
      isInSafeZone: location.isInSafeZone(),
      // Google Maps compatible marker data
      marker: {
        latitude: location.currentLocation.latitude,
        longitude: location.currentLocation.longitude,
        title: tourist?.fullName || 'Family Member',
        subtitle: `Last seen: ${location.lastUpdated.toLocaleTimeString()}`,
        accuracy: location.currentLocation.accuracy,
        heading: location.currentLocation.heading
      }
    };
  });

  return res.status(200).json(
    new ApiResponse(200, enrichedLocations, "Family locations retrieved successfully")
  );
});

// Get specific tourist's location (if permitted)
export const getTouristLocation = asyncHandler(async (req: Request, res: Response) => {
  const { touristId } = req.params;

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(404, "Tourist profile not found");
  }

  // Check if current user has permission to view this tourist's location
  const hasPermission = await checkLocationPermission(currentTourist.touristId, touristId);
  if (!hasPermission) {
    throw new ApiError(403, "You don't have permission to view this location");
  }

  // Get the tourist's location
  const location = await Location.findOne({
    touristId,
    isSharing: true,
    lastUpdated: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
  });

  if (!location) {
    throw new ApiError(404, "Location not found or not being shared");
  }

  // Get tourist details
  const tourist = await Tourist.findOne({ touristId }).select('touristId fullName phoneNumber profileImage');

  const locationData = {
    touristId: location.touristId,
    touristName: tourist?.fullName || 'Unknown',
    profileImage: tourist?.profileImage,
    location: location.currentLocation,
    lastUpdated: location.lastUpdated,
    isInSafeZone: location.isInSafeZone(),
    locationHistory: location.locationHistory.slice(-5), // Last 5 locations
    marker: {
      latitude: location.currentLocation.latitude,
      longitude: location.currentLocation.longitude,
      title: tourist?.fullName || 'Tourist',
      subtitle: `Last seen: ${location.lastUpdated.toLocaleTimeString()}`,
      accuracy: location.currentLocation.accuracy,
      heading: location.currentLocation.heading
    }
  };

  return res.status(200).json(
    new ApiResponse(200, locationData, "Tourist location retrieved successfully")
  );
});

// Toggle location sharing
export const toggleLocationSharing = asyncHandler(async (req: Request, res: Response) => {
  const { isSharing, shareWithFamily } = req.body;

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(404, "Tourist profile not found");
  }

  // Update location sharing settings
  const locationRecord = await Location.findOneAndUpdate(
    { touristId: currentTourist.touristId },
    { 
      isSharing: isSharing !== undefined ? isSharing : true,
      shareWithFamily: shareWithFamily !== undefined ? shareWithFamily : true,
      lastUpdated: new Date()
    },
    { new: true, upsert: true }
  );

  return res.status(200).json(
    new ApiResponse(200, {
      touristId: currentTourist.touristId,
      isSharing: locationRecord.isSharing,
      shareWithFamily: locationRecord.shareWithFamily
    }, "Location sharing settings updated")
  );
});

// Get location sharing status
export const getLocationSettings = asyncHandler(async (req: Request, res: Response) => {
  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(404, "Tourist profile not found");
  }

  const locationRecord = await Location.findOne({ touristId: currentTourist.touristId });

  const settings = {
    touristId: currentTourist.touristId,
    isSharing: locationRecord?.isSharing || false,
    shareWithFamily: locationRecord?.shareWithFamily || true,
    updateInterval: locationRecord?.updateInterval || 10,
    movementThreshold: locationRecord?.movementThreshold || 25,
    lastUpdated: locationRecord?.lastUpdated,
    hasActiveLocation: !!locationRecord && locationRecord.lastUpdated > new Date(Date.now() - 10 * 60 * 1000)
  };

  return res.status(200).json(
    new ApiResponse(200, settings, "Location settings retrieved successfully")
  );
});

// Update location sharing preferences
export const updateLocationSettings = asyncHandler(async (req: Request, res: Response) => {
  const { updateInterval, movementThreshold, shareWithFamily, isSharing } = req.body;

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(404, "Tourist profile not found");
  }

  const updateData: any = {};
  if (updateInterval !== undefined) updateData.updateInterval = Math.max(5, Math.min(60, updateInterval)); // 5-60 seconds
  if (movementThreshold !== undefined) updateData.movementThreshold = Math.max(10, Math.min(1000, movementThreshold)); // 10m-1km
  if (shareWithFamily !== undefined) updateData.shareWithFamily = shareWithFamily;
  if (isSharing !== undefined) updateData.isSharing = isSharing;

  const locationRecord = await Location.findOneAndUpdate(
    { touristId: currentTourist.touristId },
    updateData,
    { new: true, upsert: true }
  );

  return res.status(200).json(
    new ApiResponse(200, locationRecord, "Location settings updated successfully")
  );
});

// Emergency location broadcast (SOS)
export const emergencyLocationBroadcast = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, message = "Emergency SOS" } = req.body;

  if (!latitude || !longitude) {
    throw new ApiError(400, "Emergency location coordinates are required");
  }

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(404, "Tourist profile not found");
  }

  // Force update location with emergency flag
  const emergencyLocation = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    accuracy: req.body.accuracy ? parseFloat(req.body.accuracy) : undefined,
    timestamp: new Date()
  };

  await Location.findOneAndUpdate(
    { touristId: currentTourist.touristId },
    {
      currentLocation: emergencyLocation,
      isSharing: true, // Force sharing during emergency
      shareWithFamily: true,
      shareWithEmergency: true,
      lastUpdated: new Date()
    },
    { upsert: true }
  );

  // Grant temporary access to all family members for emergency
  await grantEmergencyLocationAccess(currentTourist.touristId);

  return res.status(200).json(
    new ApiResponse(200, {
      touristId: currentTourist.touristId,
      emergencyLocation,
      message,
      broadcastTime: new Date()
    }, "Emergency location broadcasted to family members")
  );
});

// Get real-time location updates for polling (optimized for frequent requests)
export const getLocationUpdates = asyncHandler(async (req: Request, res: Response) => {
  const { since } = req.query; // Timestamp since last update
  
  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(404, "Tourist profile not found");
  }

  const sinceDate = since ? new Date(since as string) : new Date(Date.now() - 30 * 1000); // Last 30 seconds default

  // Get family member IDs (same logic as getFamilyLocations but optimized)
  const familyTouristIds = await getFamilyMemberIds(currentTourist.touristId);

  // Get only updated locations since the specified time
  const updatedLocations = await Location.find({
    touristId: { $in: familyTouristIds },
    isSharing: true,
    shareWithFamily: true,
    lastUpdated: { $gte: sinceDate }
  }).select('touristId currentLocation lastUpdated').lean();

  // Lightweight response for polling
  const updates = updatedLocations.map(loc => ({
    touristId: loc.touristId,
    lat: loc.currentLocation.latitude,
    lng: loc.currentLocation.longitude,
    timestamp: loc.lastUpdated,
    accuracy: loc.currentLocation.accuracy,
    heading: loc.currentLocation.heading
  }));

  return res.status(200).json(
    new ApiResponse(200, {
      updates,
      hasUpdates: updates.length > 0,
      lastChecked: new Date(),
      nextPollIn: 10 // Suggest next poll in 10 seconds
    }, updates.length > 0 ? "Location updates available" : "No new updates")
  );
});

// Helper function to check if current user has permission to view target tourist's location
async function checkLocationPermission(currentTouristId: string, targetTouristId: string): Promise<boolean> {
  // Check if they are family members
  const isFamily = await Family.exists({
    $or: [
      { primaryTouristId: currentTouristId, "members.touristId": targetTouristId },
      { primaryTouristId: targetTouristId, "members.touristId": currentTouristId }
    ]
  });

  return !!isFamily;
}

// Helper function to update family location permissions
async function updateFamilyLocationPermissions(touristId: string): Promise<void> {
  const familyMemberIds = await getFamilyMemberIds(touristId);
  
  await Location.findOneAndUpdate(
    { touristId },
    {
      $set: {
        sharedWith: familyMemberIds.map(id => ({
          touristId: id,
          permission: "family" as const,
          grantedAt: new Date()
        }))
      }
    }
  );
}

// Helper function to get all family member IDs for a tourist
async function getFamilyMemberIds(touristId: string): Promise<string[]> {
  const familyTouristIds: string[] = [];

  // Get family where user is primary
  const ownFamily = await Family.findOne({ primaryTouristId: touristId });
  if (ownFamily) {
    familyTouristIds.push(...ownFamily.members.map(member => member.touristId));
  }

  // Get families where user is a member
  const memberFamilies = await Family.find({ "members.touristId": touristId });
  memberFamilies.forEach(family => {
    if (!familyTouristIds.includes(family.primaryTouristId)) {
      familyTouristIds.push(family.primaryTouristId);
    }
    family.members.forEach(member => {
      if (member.touristId !== touristId && !familyTouristIds.includes(member.touristId)) {
        familyTouristIds.push(member.touristId);
      }
    });
  });

  return familyTouristIds;
}

// Helper function to grant emergency location access
async function grantEmergencyLocationAccess(touristId: string): Promise<void> {
  const familyMemberIds = await getFamilyMemberIds(touristId);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Expires in 1 hour

  await Location.findOneAndUpdate(
    { touristId },
    {
      $addToSet: {
        sharedWith: {
          $each: familyMemberIds.map(id => ({
            touristId: id,
            permission: "emergency" as const,
            grantedAt: new Date(),
            expiresAt
          }))
        }
      }
    }
  );
}
