import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import Location from "../models/Location";
import Tourist from "../models/Tourist";
import Family from "../models/Family";

// Update location with real-time socket notification
export const updateLocationWithSocket = asyncHandler(async (req: Request, res: Response) => {
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
    throw new ApiError(400, "Latitude must be between -90 and 90");
  }

  if (longitude < -180 || longitude > 180) {
    throw new ApiError(400, "Longitude must be between -180 and 180");
  }

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile to share location");
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

  // Update location in database
  let locationRecord = await Location.findOne({ touristId: currentTourist.touristId });

  if (locationRecord) {
    // Update existing location
    locationRecord.currentLocation = locationData;
    locationRecord.isSharing = isSharing;
    locationRecord.shareWithFamily = shareWithFamily;
    locationRecord.lastUpdated = new Date();
    await locationRecord.save();
  } else {
    // Create new location record
    locationRecord = new Location({
      touristId: currentTourist.touristId,
      userId: req.user?._id,
      currentLocation: locationData,
      isSharing,
      shareWithFamily,
      lastUpdated: new Date()
    });
    await locationRecord.save();
  }

  // Real-time socket notification
  if (global.socketService && shareWithFamily && isSharing) {
    // Store in memory for real-time access
    global.socketService.setUserLocation(currentTourist.touristId, {
      ...locationData,
      touristId: currentTourist.touristId,
      isSharing,
      shareWithFamily
    });

    // Broadcast to family members
    const familyMemberIds = await getFamilyMemberIds(currentTourist.touristId);
    const locationUpdate = {
      touristId: currentTourist.touristId,
      touristName: currentTourist.fullName,
      location: locationData,
      timestamp: new Date()
    };

    familyMemberIds.forEach(memberId => {
      global.socketService.emitToTourist(memberId, 'location:family-update', locationUpdate);
    });

    // Also emit to location tracking rooms
    global.socketService.getIO().to(`location:${currentTourist.touristId}`).emit('location:live-update', locationUpdate);
  }

  return res.status(200).json(
    new ApiResponse(200, {
      touristId: currentTourist.touristId,
      location: locationRecord.currentLocation,
      isSharing: locationRecord.isSharing,
      shareWithFamily: locationRecord.shareWithFamily,
      lastUpdated: locationRecord.lastUpdated,
      realTimeEnabled: !!global.socketService
    }, "Location updated successfully with real-time notifications")
  );
});

// Get family locations with real-time data
export const getFamilyLocationsWithSocket = asyncHandler(async (req: Request, res: Response) => {
  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile to view family locations");
  }

  // Get family members
  const familyMemberIds = await getFamilyMemberIds(currentTourist.touristId);
  
  if (familyMemberIds.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, [], "No family members found")
    );
  }

  const enrichedLocations = [];

  // Get real-time locations from socket service if available
  if (global.socketService) {
    for (const memberId of familyMemberIds) {
      const realtimeLocation = global.socketService.getUserLocation(memberId);
      const tourist = await Tourist.findOne({ touristId: memberId }).select('touristId fullName phoneNumber profileImage');
      
      if (realtimeLocation && realtimeLocation.isSharing && realtimeLocation.shareWithFamily) {
        enrichedLocations.push({
          touristId: memberId,
          fullName: tourist?.fullName,
          profileImage: tourist?.profileImage,
          phoneNumber: tourist?.phoneNumber,
          location: realtimeLocation,
          isOnline: global.socketService.isUserOnline(memberId),
          lastUpdated: realtimeLocation.timestamp,
          source: 'realtime'
        });
      } else {
        // Fallback to database
        const dbLocation = await Location.findOne({
          touristId: memberId,
          isSharing: true,
          shareWithFamily: true,
          lastUpdated: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        });

        if (dbLocation) {
          enrichedLocations.push({
            touristId: memberId,
            fullName: tourist?.fullName,
            profileImage: tourist?.profileImage,
            phoneNumber: tourist?.phoneNumber,
            location: dbLocation.currentLocation,
            isOnline: false,
            lastUpdated: dbLocation.lastUpdated,
            source: 'database'
          });
        }
      }
    }
  } else {
    // No socket service, use database only
    const familyLocations = await Location.find({
      touristId: { $in: familyMemberIds },
      isSharing: true,
      shareWithFamily: true,
      lastUpdated: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });

    for (const location of familyLocations) {
      const tourist = await Tourist.findOne({ touristId: location.touristId }).select('touristId fullName phoneNumber profileImage');
      
      enrichedLocations.push({
        touristId: location.touristId,
        fullName: tourist?.fullName,
        profileImage: tourist?.profileImage,
        phoneNumber: tourist?.phoneNumber,
        location: location.currentLocation,
        isOnline: false,
        lastUpdated: location.lastUpdated,
        source: 'database'
      });
    }
  }

  return res.status(200).json(
    new ApiResponse(200, {
      locations: enrichedLocations,
      totalMembers: familyMemberIds.length,
      activeMembers: enrichedLocations.length,
      realTimeEnabled: !!global.socketService,
      lastUpdate: new Date()
    }, "Family locations retrieved successfully")
  );
});

// Emergency location broadcast with socket
export const emergencyLocationBroadcastWithSocket = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, message = "Emergency SOS", accuracy } = req.body;

  if (!latitude || !longitude) {
    throw new ApiError(400, "Emergency location coordinates are required");
  }

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile to send emergency alerts");
  }

  const emergencyLocation = {
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    accuracy: accuracy ? parseFloat(accuracy) : undefined,
    timestamp: new Date()
  };

  // Force update location with emergency flag
  await Location.findOneAndUpdate(
    { touristId: currentTourist.touristId },
    {
      currentLocation: emergencyLocation,
      isSharing: true,
      shareWithFamily: true,
      shareWithEmergency: true,
      lastUpdated: new Date()
    },
    { upsert: true }
  );

  const emergencyData = {
    touristId: currentTourist.touristId,
    touristName: currentTourist.fullName,
    location: emergencyLocation,
    message,
    severity: "high",
    alertId: `SOS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    status: 'active'
  };

  // Real-time socket notifications
  if (global.socketService) {
    // Store emergency location in memory
    global.socketService.setUserLocation(currentTourist.touristId, {
      ...emergencyLocation,
      isEmergency: true,
      emergencyData
    });

    // Get family members
    const familyMemberIds = await getFamilyMemberIds(currentTourist.touristId);
    
    // Broadcast emergency to family
    familyMemberIds.forEach(memberId => {
      global.socketService.emitToTourist(memberId, 'emergency:family-alert', emergencyData);
    });

    // Broadcast to emergency services/monitoring
    global.socketService.getIO().emit('emergency:new-alert', emergencyData);
  }

  return res.status(200).json(
    new ApiResponse(200, {
      alertId: emergencyData.alertId,
      touristId: currentTourist.touristId,
      emergencyLocation,
      message,
      timestamp: emergencyData.timestamp,
      familyNotified: !!global.socketService,
      emergencyServicesNotified: !!global.socketService
    }, "Emergency location broadcasted successfully")
  );
});

// Get real-time connection status
export const getRealtimeStatus = asyncHandler(async (req: Request, res: Response) => {
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile");
  }

  const status: any = {
    socketServiceAvailable: !!global.socketService,
    isOnline: global.socketService ? global.socketService.isUserOnline(req.user!._id.toString()) : false,
    hasRealtimeLocation: global.socketService ? !!global.socketService.getUserLocation(currentTourist.touristId) : false,
    connectedUsers: global.socketService ? global.socketService.getConnectedUsers().size : 0,
    timestamp: new Date()
  };

  if (global.socketService) {
    const familyMemberIds = await getFamilyMemberIds(currentTourist.touristId);
    const onlineFamilyMembers = familyMemberIds.filter(memberId => 
      global.socketService.isUserOnline(memberId)
    );

    status.familyMembers = {
      total: familyMemberIds.length,
      online: onlineFamilyMembers.length,
      onlineMembers: onlineFamilyMembers
    };
  }

  return res.status(200).json(
    new ApiResponse(200, status, "Real-time status retrieved successfully")
  );
});

// Helper function to get family member IDs
async function getFamilyMemberIds(touristId: string): Promise<string[]> {
  const familyMemberIds: string[] = [];

  // Get family where current user is primary
  const family = await Family.findOne({ primaryTouristId: touristId });
  if (family) {
    familyMemberIds.push(...family.members.map(member => member.touristId));
  }

  // Get families where current user is a member
  const memberFamilies = await Family.find({
    "members.touristId": touristId
  });

  memberFamilies.forEach(memberFamily => {
    familyMemberIds.push(memberFamily.primaryTouristId);
    memberFamily.members.forEach(member => {
      if (member.touristId !== touristId) {
        familyMemberIds.push(member.touristId);
      }
    });
  });

  return [...new Set(familyMemberIds)]; // Remove duplicates
}