import { AuthenticatedSocket } from "./index";
import Location from "../models/Location";
import Tourist from "../models/Tourist";
import Family from "../models/Family";

export const locationSocketHandlers = (socket: AuthenticatedSocket, socketService: any) => {
  
  // Handle real-time location updates
  socket.on('location:update', async (data) => {
    try {
      const { latitude, longitude, accuracy, altitude, heading, speed, isSharing = true, shareWithFamily = true } = data;

      if (!socket.user?.touristId) {
        socket.emit('location:error', { message: 'Tourist profile required for location tracking' });
        return;
      }

      // Validate coordinates
      if (!latitude || !longitude || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        socket.emit('location:error', { message: 'Invalid coordinates provided' });
        return;
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
      const locationRecord = await Location.findOneAndUpdate(
        { touristId: socket.user.touristId },
        {
          currentLocation: locationData,
          isSharing,
          shareWithFamily,
          lastUpdated: new Date()
        },
        { new: true, upsert: true }
      );

      // Store in memory for real-time access
      socketService.setUserLocation(socket.user.touristId, {
        ...locationData,
        touristId: socket.user.touristId,
        isSharing,
        shareWithFamily
      });

      // Emit confirmation to sender
      socket.emit('location:updated', {
        touristId: socket.user.touristId,
        location: locationData,
        isSharing,
        shareWithFamily,
        timestamp: new Date()
      });

      // Broadcast to family members if sharing is enabled
      if (shareWithFamily && isSharing) {
        await broadcastLocationToFamily(socket.user.touristId, locationData, socketService);
      }

      console.log(`📍 Location updated for ${socket.user.touristId}: ${latitude}, ${longitude}`);

    } catch (error) {
      console.error('Location update error:', error);
      socket.emit('location:error', { message: 'Failed to update location' });
    }
  });

  // Handle location sharing toggle
  socket.on('location:toggle-sharing', async (data) => {
    try {
      const { isSharing, shareWithFamily } = data;

      if (!socket.user?.touristId) {
        socket.emit('location:error', { message: 'Tourist profile required' });
        return;
      }

      await Location.findOneAndUpdate(
        { touristId: socket.user.touristId },
        { isSharing, shareWithFamily, lastUpdated: new Date() },
        { upsert: true }
      );

      socket.emit('location:sharing-updated', {
        touristId: socket.user.touristId,
        isSharing,
        shareWithFamily
      });

      // Notify family members about sharing status change
      if (!isSharing) {
        await notifyFamilyOfSharingStop(socket.user.touristId, socketService);
      }

    } catch (error) {
      console.error('Location sharing toggle error:', error);
      socket.emit('location:error', { message: 'Failed to update sharing settings' });
    }
  });

  // Handle location requests from family members
  socket.on('location:request-family', async () => {
    try {
      if (!socket.user?.touristId) {
        socket.emit('location:error', { message: 'Tourist profile required' });
        return;
      }

      const familyLocations = await getFamilyLocationsRealtime(socket.user.touristId, socketService);
      socket.emit('location:family-locations', familyLocations);

    } catch (error) {
      console.error('Family locations request error:', error);
      socket.emit('location:error', { message: 'Failed to get family locations' });
    }
  });

  // Handle specific tourist location request
  socket.on('location:request-tourist', async (data) => {
    try {
      const { touristId } = data;

      if (!socket.user?.touristId) {
        socket.emit('location:error', { message: 'Tourist profile required' });
        return;
      }

      // Check permission
      const hasPermission = await checkLocationPermission(socket.user.touristId, touristId);
      if (!hasPermission) {
        socket.emit('location:error', { message: 'No permission to view this location' });
        return;
      }

      const location = socketService.getUserLocation(touristId) || 
                      await getLatestLocationFromDB(touristId);
      
      if (location) {
        socket.emit('location:tourist-location', {
          touristId,
          location,
          timestamp: new Date()
        });
      } else {
        socket.emit('location:error', { message: 'Location not available' });
      }

    } catch (error) {
      console.error('Tourist location request error:', error);
      socket.emit('location:error', { message: 'Failed to get tourist location' });
    }
  });

  // Handle location history request
  socket.on('location:request-history', async (data) => {
    try {
      const { touristId, hours = 24 } = data;

      if (!socket.user?.touristId) {
        socket.emit('location:error', { message: 'Tourist profile required' });
        return;
      }

      // Check permission (can only view own history or family with permission)
      if (touristId !== socket.user.touristId) {
        const hasPermission = await checkLocationPermission(socket.user.touristId, touristId);
        if (!hasPermission) {
          socket.emit('location:error', { message: 'No permission to view location history' });
          return;
        }
      }

      const locationRecord = await Location.findOne({ touristId }).select('locationHistory');
      const history = locationRecord?.locationHistory || [];

      // Filter by time range
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const filteredHistory = history.filter(loc => loc.timestamp >= cutoffTime);

      socket.emit('location:history', {
        touristId,
        history: filteredHistory,
        hours
      });

    } catch (error) {
      console.error('Location history request error:', error);
      socket.emit('location:error', { message: 'Failed to get location history' });
    }
  });

  // Handle joining location room for specific tourist
  socket.on('location:join-tracking', async (data) => {
    try {
      const { touristId } = data;

      if (!socket.user?.touristId) {
        socket.emit('location:error', { message: 'Tourist profile required' });
        return;
      }

      // Check permission
      const hasPermission = await checkLocationPermission(socket.user.touristId, touristId);
      if (!hasPermission) {
        socket.emit('location:error', { message: 'No permission to track this tourist' });
        return;
      }

      socket.join(`location:${touristId}`);
      socket.emit('location:tracking-joined', { touristId });

    } catch (error) {
      console.error('Location tracking join error:', error);
      socket.emit('location:error', { message: 'Failed to join location tracking' });
    }
  });

  socket.on('location:leave-tracking', (data) => {
    const { touristId } = data;
    socket.leave(`location:${touristId}`);
    socket.emit('location:tracking-left', { touristId });
  });
};

// Helper functions
async function broadcastLocationToFamily(touristId: string, locationData: any, socketService: any) {
  try {
    const familyMemberIds = await getFamilyMemberIds(touristId);
    
    const locationUpdate = {
      touristId,
      location: locationData,
      timestamp: new Date()
    };

    // Emit to family members
    familyMemberIds.forEach(memberId => {
      socketService.emitToTourist(memberId, 'location:family-update', locationUpdate);
    });

    // Also emit to specific location tracking rooms
    socketService.getIO().to(`location:${touristId}`).emit('location:live-update', locationUpdate);

  } catch (error) {
    console.error('Error broadcasting location to family:', error);
  }
}

async function notifyFamilyOfSharingStop(touristId: string, socketService: any) {
  try {
    const familyMemberIds = await getFamilyMemberIds(touristId);
    
    familyMemberIds.forEach(memberId => {
      socketService.emitToTourist(memberId, 'location:sharing-stopped', {
        touristId,
        timestamp: new Date()
      });
    });

  } catch (error) {
    console.error('Error notifying family of sharing stop:', error);
  }
}

async function getFamilyLocationsRealtime(touristId: string, socketService: any) {
  const familyMemberIds = await getFamilyMemberIds(touristId);
  const locations = [];

  for (const memberId of familyMemberIds) {
    const location = socketService.getUserLocation(memberId);
    if (location && location.isSharing && location.shareWithFamily) {
      const tourist = await Tourist.findOne({ touristId: memberId }).select('fullName profileImage');
      locations.push({
        touristId: memberId,
        fullName: tourist?.fullName,
        profileImage: tourist?.profileImage,
        location: location,
        isOnline: true,
        lastUpdated: location.timestamp
      });
    }
  }

  return locations;
}

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

async function checkLocationPermission(currentTouristId: string, targetTouristId: string): Promise<boolean> {
  if (currentTouristId === targetTouristId) return true;

  const familyMemberIds = await getFamilyMemberIds(currentTouristId);
  return familyMemberIds.includes(targetTouristId);
}

async function getLatestLocationFromDB(touristId: string) {
  const locationRecord = await Location.findOne({ 
    touristId, 
    isSharing: true,
    lastUpdated: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
  });

  return locationRecord?.currentLocation;
}