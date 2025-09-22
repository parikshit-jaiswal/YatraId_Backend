import { AuthenticatedSocket } from "./index";
import Family from "../models/Family";
import Tourist from "../models/Tourist";

export const familySocketHandlers = (socket: AuthenticatedSocket, socketService: any) => {
  
  // Handle joining family room for real-time updates
  socket.on('family:join', async () => {
    try {
      if (!socket.user?.touristId) {
        socket.emit('family:error', { message: 'Tourist profile required' });
        return;
      }

      // Join family-specific rooms
      const familyIds = await getFamilyIds(socket.user.touristId);
      familyIds.forEach(familyId => {
        socket.join(`family:${familyId}`);
      });

      socket.emit('family:joined', { 
        familyIds,
        timestamp: new Date()
      });

      console.log(`👨‍👩‍👧‍👦 Tourist ${socket.user.touristId} joined family tracking`);

    } catch (error) {
      console.error('Family join error:', error);
      socket.emit('family:error', { message: 'Failed to join family tracking' });
    }
  });

  // Handle family member status updates
  socket.on('family:member-status', async (data) => {
    try {
      const { status, message } = data; // status: 'safe', 'help_needed', 'emergency', 'offline'

      if (!socket.user?.touristId) {
        socket.emit('family:error', { message: 'Tourist profile required' });
        return;
      }

      const statusUpdate = {
        touristId: socket.user.touristId,
        status,
        message: message || '',
        timestamp: new Date()
      };

      // Broadcast to all family members
      const familyIds = await getFamilyIds(socket.user.touristId);
      familyIds.forEach(familyId => {
        socketService.getIO().to(`family:${familyId}`).emit('family:member-status-update', statusUpdate);
      });

      socket.emit('family:status-updated', statusUpdate);

    } catch (error) {
      console.error('Family member status update error:', error);
      socket.emit('family:error', { message: 'Failed to update status' });
    }
  });

  // Handle family member addition notification
  socket.on('family:member-added', async (data) => {
    try {
      const { touristId, relationship, familyName } = data;

      if (!socket.user?.touristId) {
        socket.emit('family:error', { message: 'Tourist profile required' });
        return;
      }

      // Get family details
      const family = await Family.findOne({ primaryTouristId: socket.user.touristId });
      if (!family) {
        socket.emit('family:error', { message: 'Family not found' });
        return;
      }

      const addedMember = family.members.find(member => member.touristId === touristId);
      if (!addedMember) {
        socket.emit('family:error', { message: 'Member not found in family' });
        return;
      }

      // Notify the added member
      socketService.emitToTourist(touristId, 'family:added-to-family', {
        familyId: socket.user.touristId,
        familyName: family.familyName,
        addedBy: socket.user.touristId,
        relationship,
        timestamp: new Date()
      });

      // Notify other family members
      socketService.getIO().to(`family:${socket.user.touristId}`).emit('family:new-member', {
        touristId,
        fullName: addedMember.fullName,
        relationship,
        addedBy: socket.user.touristId,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Family member addition notification error:', error);
      socket.emit('family:error', { message: 'Failed to notify family members' });
    }
  });

  // Handle family member removal notification
  socket.on('family:member-removed', async (data) => {
    try {
      const { touristId, reason } = data;

      if (!socket.user?.touristId) {
        socket.emit('family:error', { message: 'Tourist profile required' });
        return;
      }

      // Notify the removed member
      socketService.emitToTourist(touristId, 'family:removed-from-family', {
        familyId: socket.user.touristId,
        removedBy: socket.user.touristId,
        reason: reason || 'No reason provided',
        timestamp: new Date()
      });

      // Notify other family members
      socketService.getIO().to(`family:${socket.user.touristId}`).emit('family:member-left', {
        touristId,
        removedBy: socket.user.touristId,
        reason,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Family member removal notification error:', error);
      socket.emit('family:error', { message: 'Failed to notify family members' });
    }
  });

  // Handle family settings update
  socket.on('family:settings-updated', async (data) => {
    try {
      const { familyName, shareLocation, emergencyNotifications } = data;

      if (!socket.user?.touristId) {
        socket.emit('family:error', { message: 'Tourist profile required' });
        return;
      }

      const updateData = {
        familyId: socket.user.touristId,
        familyName,
        shareLocation,
        emergencyNotifications,
        updatedBy: socket.user.touristId,
        timestamp: new Date()
      };

      // Notify all family members about settings change
      socketService.getIO().to(`family:${socket.user.touristId}`).emit('family:settings-change', updateData);

    } catch (error) {
      console.error('Family settings update notification error:', error);
      socket.emit('family:error', { message: 'Failed to notify family of settings change' });
    }
  });

  // Handle family member online/offline status
  socket.on('family:update-online-status', async (data) => {
    try {
      const { isOnline } = data;

      if (!socket.user?.touristId) {
        socket.emit('family:error', { message: 'Tourist profile required' });
        return;
      }

      const statusUpdate = {
        touristId: socket.user.touristId,
        isOnline,
        lastSeen: new Date(),
        timestamp: new Date()
      };

      // Broadcast online status to all family members
      const familyIds = await getFamilyIds(socket.user.touristId);
      familyIds.forEach(familyId => {
        socketService.getIO().to(`family:${familyId}`).emit('family:online-status', statusUpdate);
      });

    } catch (error) {
      console.error('Family online status update error:', error);
      socket.emit('family:error', { message: 'Failed to update online status' });
    }
  });

  // Handle family chat/messaging
  socket.on('family:send-message', async (data) => {
    try {
      const { message, type = 'text', familyId } = data; // type: 'text', 'location', 'alert'

      if (!socket.user?.touristId) {
        socket.emit('family:error', { message: 'Tourist profile required' });
        return;
      }

      // Verify user is member of the family
      const hasAccess = await verifyFamilyAccess(socket.user.touristId, familyId);
      if (!hasAccess) {
        socket.emit('family:error', { message: 'No access to this family' });
        return;
      }

      const messageData = {
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        familyId,
        fromTouristId: socket.user.touristId,
        message,
        type,
        timestamp: new Date()
      };

      // Broadcast message to family
      socketService.getIO().to(`family:${familyId}`).emit('family:new-message', messageData);

      socket.emit('family:message-sent', messageData);

    } catch (error) {
      console.error('Family message send error:', error);
      socket.emit('family:error', { message: 'Failed to send message' });
    }
  });

  // Handle requesting family member list with online status
  socket.on('family:request-members', async () => {
    try {
      if (!socket.user?.touristId) {
        socket.emit('family:error', { message: 'Tourist profile required' });
        return;
      }

      const familyMembers = await getFamilyMembersWithStatus(socket.user.touristId, socketService);
      socket.emit('family:members-list', {
        members: familyMembers,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Family members request error:', error);
      socket.emit('family:error', { message: 'Failed to get family members' });
    }
  });

  // Handle leaving family rooms
  socket.on('family:leave', async () => {
    try {
      if (!socket.user?.touristId) {
        return;
      }

      const familyIds = await getFamilyIds(socket.user.touristId);
      familyIds.forEach(familyId => {
        socket.leave(`family:${familyId}`);
      });

      socket.emit('family:left', { 
        familyIds,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Family leave error:', error);
    }
  });
};

// Helper functions
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

async function verifyFamilyAccess(touristId: string, familyId: string): Promise<boolean> {
  // Check if user is primary of the family
  const primaryFamily = await Family.findOne({ primaryTouristId: touristId });
  if (primaryFamily && touristId === familyId) return true;

  // Check if user is member of the family
  const memberFamily = await Family.findOne({
    primaryTouristId: familyId,
    "members.touristId": touristId
  });

  return !!memberFamily;
}

async function getFamilyMembersWithStatus(touristId: string, socketService: any) {
  const members = [];

  // Get family where current user is primary
  const family = await Family.findOne({ primaryTouristId: touristId });
  if (family) {
    for (const member of family.members) {
      const tourist = await Tourist.findOne({ touristId: member.touristId })
        .select('fullName profileImage phoneNumber');
      
      const isOnline = socketService.isUserOnline(member.touristId);
      const location = socketService.getUserLocation(member.touristId);

      members.push({
        touristId: member.touristId,
        fullName: tourist?.fullName || member.fullName,
        profileImage: tourist?.profileImage,
        phoneNumber: tourist?.phoneNumber || member.phoneNumber,
        relationship: member.relationship,
        emergencyContact: member.emergencyContact,
        isOnline,
        hasLocation: !!location,
        addedAt: member.addedAt
      });
    }
  }

  // Get families where current user is a member (add primary tourists)
  const memberFamilies = await Family.find({
    "members.touristId": touristId
  });

  for (const memberFamily of memberFamilies) {
    const primaryTourist = await Tourist.findOne({ touristId: memberFamily.primaryTouristId })
      .select('fullName profileImage phoneNumber');
    
    const isOnline = socketService.isUserOnline(memberFamily.primaryTouristId);
    const location = socketService.getUserLocation(memberFamily.primaryTouristId);

    // Find relationship from current user's perspective
    const memberRecord = memberFamily.members.find(m => m.touristId === touristId);
    const relationship = getInverseRelationship(memberRecord?.relationship || 'other');

    members.push({
      touristId: memberFamily.primaryTouristId,
      fullName: primaryTourist?.fullName,
      profileImage: primaryTourist?.profileImage,
      phoneNumber: primaryTourist?.phoneNumber,
      relationship,
      emergencyContact: false, // Primary is not emergency contact by default
      isOnline,
      hasLocation: !!location,
      isPrimary: true,
      familyName: memberFamily.familyName
    });
  }

  return members;
}

function getInverseRelationship(relationship: string): string {
  const inverseMap: { [key: string]: string } = {
    "parent": "child",
    "child": "parent", 
    "spouse": "spouse",
    "sibling": "sibling",
    "guardian": "child",
    "other": "other"
  };
  return inverseMap[relationship] || "other";
}