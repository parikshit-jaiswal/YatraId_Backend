import { AuthenticatedSocket } from "./index";
import Tourist from "../models/Tourist";
import Family from "../models/Family";
import Location from "../models/Location";

export const emergencySocketHandlers = (socket: AuthenticatedSocket, socketService: any) => {
  
  // Handle SOS/Emergency alerts
  socket.on('emergency:sos', async (data) => {
    try {
      const { 
        latitude, 
        longitude, 
        accuracy, 
        message = "Emergency SOS - Need immediate help!", 
        severity = "high",
        type = "general" // general, medical, crime, accident, natural_disaster
      } = data;

      if (!socket.user?.touristId) {
        socket.emit('emergency:error', { message: 'Tourist profile required' });
        return;
      }

      // Validate coordinates
      if (!latitude || !longitude) {
        socket.emit('emergency:error', { message: 'Location coordinates required for SOS' });
        return;
      }

      const emergencyData = {
        touristId: socket.user.touristId,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: accuracy ? parseFloat(accuracy) : undefined,
          timestamp: new Date()
        },
        message,
        severity, // low, medium, high, critical
        type,
        alertId: `SOS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        status: 'active'
      };

      // Force enable location sharing for emergency
      await Location.findOneAndUpdate(
        { touristId: socket.user.touristId },
        {
          currentLocation: emergencyData.location,
          isSharing: true,
          shareWithFamily: true,
          shareWithEmergency: true,
          lastUpdated: new Date()
        },
        { upsert: true }
      );

      // Update tourist record with panic data
      await Tourist.findOneAndUpdate(
        { touristId: socket.user.touristId },
        {
          $push: {
            panics: {
              location: emergencyData.location,
              timestamp: emergencyData.timestamp,
              evidenceCID: "pending", // Will be updated when evidence is uploaded
              onchainStatus: "pending"
            }
          }
        }
      );

      // Store emergency in memory for quick access
      socketService.setUserLocation(socket.user.touristId, {
        ...emergencyData.location,
        isEmergency: true,
        emergencyData
      });

      // Broadcast to all family members
      await broadcastEmergencyToFamily(socket.user.touristId, emergencyData, socketService);

      // Emit to emergency services/admin channels
      socketService.getIO().emit('emergency:new-alert', emergencyData);

      // Confirm SOS sent to the sender
      socket.emit('emergency:sos-sent', {
        alertId: emergencyData.alertId,
        location: emergencyData.location,
        message: emergencyData.message,
        timestamp: emergencyData.timestamp,
        familyNotified: true,
        emergencyServicesNotified: true
      });

      console.log(`🚨 SOS Alert from ${socket.user.touristId}: ${message} at ${latitude}, ${longitude}`);

    } catch (error) {
      console.error('Emergency SOS error:', error);
      socket.emit('emergency:error', { message: 'Failed to send SOS alert' });
    }
  });

  // Handle SOS cancellation
  socket.on('emergency:cancel-sos', async (data) => {
    try {
      const { alertId, reason = "False alarm" } = data;

      if (!socket.user?.touristId) {
        socket.emit('emergency:error', { message: 'Tourist profile required' });
        return;
      }

      const cancellationData = {
        touristId: socket.user.touristId,
        alertId,
        reason,
        cancelledAt: new Date(),
        status: 'cancelled'
      };

      // Notify family members of cancellation
      await notifyFamilyOfSOSCancellation(socket.user.touristId, cancellationData, socketService);

      // Notify emergency services
      socketService.getIO().emit('emergency:alert-cancelled', cancellationData);

      socket.emit('emergency:sos-cancelled', cancellationData);

      console.log(`✅ SOS Cancelled by ${socket.user.touristId}: ${reason}`);

    } catch (error) {
      console.error('Emergency SOS cancellation error:', error);
      socket.emit('emergency:error', { message: 'Failed to cancel SOS' });
    }
  });

  // Handle emergency response from family member
  socket.on('emergency:respond', async (data) => {
    try {
      const { 
        alertId, 
        touristId, 
        response, // "on_way", "calling_help", "contacted_authorities", "safe"
        message,
        eta // estimated time of arrival in minutes
      } = data;

      if (!socket.user?.touristId) {
        socket.emit('emergency:error', { message: 'Tourist profile required' });
        return;
      }

      const responseData = {
        alertId,
        responderTouristId: socket.user.touristId,
        targetTouristId: touristId,
        response,
        message: message || '',
        eta: eta || null,
        timestamp: new Date()
      };

      // Notify the person in emergency
      socketService.emitToTourist(touristId, 'emergency:response-received', responseData);

      // Notify other family members about the response
      const familyMemberIds = await getFamilyMemberIds(touristId);
      familyMemberIds.forEach(memberId => {
        if (memberId !== socket.user?.touristId) {
          socketService.emitToTourist(memberId, 'emergency:family-response', responseData);
        }
      });

      socket.emit('emergency:response-sent', responseData);

    } catch (error) {
      console.error('Emergency response error:', error);
      socket.emit('emergency:error', { message: 'Failed to send emergency response' });
    }
  });

  // Handle emergency status update
  socket.on('emergency:update-status', async (data) => {
    try {
      const { 
        alertId, 
        status, // active, resolved, false_alarm, escalated
        message,
        location // optional updated location
      } = data;

      if (!socket.user?.touristId) {
        socket.emit('emergency:error', { message: 'Tourist profile required' });
        return;
      }

      const statusUpdate = {
        alertId,
        touristId: socket.user.touristId,
        status,
        message: message || '',
        location: location || null,
        updatedAt: new Date()
      };

      // Broadcast status update to family
      const familyMemberIds = await getFamilyMemberIds(socket.user.touristId);
      familyMemberIds.forEach(memberId => {
        socketService.emitToTourist(memberId, 'emergency:status-update', statusUpdate);
      });

      // Notify emergency services
      socketService.getIO().emit('emergency:status-changed', statusUpdate);

      socket.emit('emergency:status-updated', statusUpdate);

    } catch (error) {
      console.error('Emergency status update error:', error);
      socket.emit('emergency:error', { message: 'Failed to update emergency status' });
    }
  });

  // Handle emergency contact notification
  socket.on('emergency:notify-contacts', async (data) => {
    try {
      const { alertId, message, includeLocation = true } = data;

      if (!socket.user?.touristId) {
        socket.emit('emergency:error', { message: 'Tourist profile required' });
        return;
      }

      // Get tourist data to access emergency contacts
      const tourist = await Tourist.findOne({ touristId: socket.user.touristId });
      if (!tourist) {
        socket.emit('emergency:error', { message: 'Tourist profile not found' });
        return;
      }

      const location = socketService.getUserLocation(socket.user.touristId);
      
      const notificationData = {
        touristId: socket.user.touristId,
        touristName: tourist.fullName,
        alertId,
        message,
        location: includeLocation ? location : null,
        timestamp: new Date(),
        contactsNotified: true
      };

      // Here you would integrate with SMS/Email service to notify emergency contacts
      // For now, we'll just emit the event
      socketService.getIO().emit('emergency:contacts-notified', notificationData);

      socket.emit('emergency:contacts-notification-sent', notificationData);

    } catch (error) {
      console.error('Emergency contacts notification error:', error);
      socket.emit('emergency:error', { message: 'Failed to notify emergency contacts' });
    }
  });

  // Handle joining emergency monitoring (for admin/emergency services)
  socket.on('emergency:join-monitoring', async () => {
    try {
      // Only allow admin or emergency service accounts
      // You might want to add role checking here
      socket.join('emergency:monitoring');
      socket.emit('emergency:monitoring-joined', { timestamp: new Date() });

    } catch (error) {
      console.error('Emergency monitoring join error:', error);
      socket.emit('emergency:error', { message: 'Failed to join emergency monitoring' });
    }
  });

  // Handle leaving emergency monitoring
  socket.on('emergency:leave-monitoring', () => {
    socket.leave('emergency:monitoring');
    socket.emit('emergency:monitoring-left', { timestamp: new Date() });
  });

  // Handle emergency evidence upload notification
  socket.on('emergency:evidence-uploaded', async (data) => {
    try {
      const { alertId, evidenceType, evidenceUrl, description } = data;

      if (!socket.user?.touristId) {
        socket.emit('emergency:error', { message: 'Tourist profile required' });
        return;
      }

      const evidenceData = {
        alertId,
        touristId: socket.user.touristId,
        evidenceType, // photo, video, audio, document
        evidenceUrl,
        description: description || '',
        uploadedAt: new Date()
      };

      // Notify family members about evidence upload
      const familyMemberIds = await getFamilyMemberIds(socket.user.touristId);
      familyMemberIds.forEach(memberId => {
        socketService.emitToTourist(memberId, 'emergency:evidence-added', evidenceData);
      });

      // Notify emergency services
      socketService.getIO().to('emergency:monitoring').emit('emergency:new-evidence', evidenceData);

      socket.emit('emergency:evidence-upload-confirmed', evidenceData);

    } catch (error) {
      console.error('Emergency evidence upload notification error:', error);
      socket.emit('emergency:error', { message: 'Failed to notify about evidence upload' });
    }
  });
};

// Helper functions
async function broadcastEmergencyToFamily(touristId: string, emergencyData: any, socketService: any) {
  try {
    const familyMemberIds = await getFamilyMemberIds(touristId);
    
    // Get tourist info for the alert
    const tourist = await Tourist.findOne({ touristId }).select('fullName profileImage phoneNumber');
    
    const familyAlert = {
      ...emergencyData,
      touristName: tourist?.fullName,
      touristImage: tourist?.profileImage,
      touristPhone: tourist?.phoneNumber,
      isEmergency: true
    };

    familyMemberIds.forEach(memberId => {
      socketService.emitToTourist(memberId, 'emergency:family-alert', familyAlert);
    });

    // Also emit to family rooms
    const familyIds = await getFamilyIds(touristId);
    familyIds.forEach(familyId => {
      socketService.getIO().to(`family:${familyId}`).emit('emergency:family-sos', familyAlert);
    });

  } catch (error) {
    console.error('Error broadcasting emergency to family:', error);
  }
}

async function notifyFamilyOfSOSCancellation(touristId: string, cancellationData: any, socketService: any) {
  try {
    const familyMemberIds = await getFamilyMemberIds(touristId);
    
    familyMemberIds.forEach(memberId => {
      socketService.emitToTourist(memberId, 'emergency:sos-cancelled-family', cancellationData);
    });

  } catch (error) {
    console.error('Error notifying family of SOS cancellation:', error);
  }
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

async function getFamilyIds(touristId: string): Promise<string[]> {
  const familyIds: string[] = [];

  // Get family where current user is primary
  const family = await Family.findOne({ primaryTouristId: touristId });
  if (family) {
    familyIds.push(touristId); // Use primary tourist ID as family ID
  }

  // Get families where current user is a member
  const memberFamilies = await Family.find({
    "members.touristId": touristId
  });

  memberFamilies.forEach(memberFamily => {
    familyIds.push(memberFamily.primaryTouristId);
  });

  return [...new Set(familyIds)]; // Remove duplicates
}