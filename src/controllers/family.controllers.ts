import { Request, Response } from "express";
import Family from "../models/Family";
import Tourist from "../models/Tourist";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

// Helper function to get inverse relationship
const getInverseRelationship = (relationship: string): string => {
  const inverseMap: { [key: string]: string } = {
    "parent": "child",
    "child": "parent", 
    "spouse": "spouse",
    "sibling": "sibling",
    "guardian": "child", // guardian's inverse is child (person being guarded)
    "other": "other"
  };
  return inverseMap[relationship] || "other";
};

// Create or get family for current user
export const createFamily = asyncHandler(async (req: Request, res: Response) => {
  const { familyName, shareLocation = true, emergencyNotifications = true } = req.body;

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile to create a family");
  }

  // Check if family already exists
  const existingFamily = await Family.findOne({ primaryTouristId: currentTourist.touristId });
  if (existingFamily) {
    throw new ApiError(400, "Family group already exists for this tourist");
  }

  // Create new family
  const family = new Family({
    primaryTouristId: currentTourist.touristId,
    primaryUserId: req.user?._id,
    familyName,
    shareLocation,
    emergencyNotifications,
    members: []
  });

  await family.save();

  return res.status(201).json(
    new ApiResponse(201, family, "Family group created successfully")
  );
});

// Add family member by touristId
export const addFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const { touristId, relationship, emergencyContact = false } = req.body;

  if (!touristId || !relationship) {
    throw new ApiError(400, "Tourist ID and relationship are required");
  }

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile to manage family");
  }

  // Find the tourist to add
  const targetTourist = await Tourist.findOne({ touristId });
  if (!targetTourist) {
    throw new ApiError(404, "Tourist not found with this ID");
  }

  // Prevent adding yourself
  if (targetTourist.touristId === currentTourist.touristId) {
    throw new ApiError(400, "You cannot add yourself as a family member");
  }

  // Get or create family
  let family = await Family.findOne({ primaryTouristId: currentTourist.touristId });
  if (!family) {
    family = new Family({
      primaryTouristId: currentTourist.touristId,
      primaryUserId: req.user?._id,
      shareLocation: true,
      emergencyNotifications: true,
      members: []
    });
  }

  // Check if member already exists
  const existingMember = family.members.find(member => member.touristId === touristId);
  if (existingMember) {
    throw new ApiError(400, "This tourist is already a family member");
  }

  // Add new family member
  const newMember = {
    touristId: targetTourist.touristId!,
    fullName: targetTourist.fullName,
    relationship,
    phoneNumber: targetTourist.phoneNumber,
    emergencyContact,
    addedAt: new Date()
  };

  family.members.push(newMember);
  await family.save();

  // Also add family connection to the target tourist for reverse lookup
  await Tourist.findOneAndUpdate(
    { touristId: targetTourist.touristId },
    {
      $addToSet: {
        familyConnections: {
          familyId: currentTourist.touristId,
          relationship: getInverseRelationship(relationship),
          addedAt: new Date()
        }
      }
    }
  );

  return res.status(200).json(
    new ApiResponse(200, family, "Family member added successfully")
  );
});

// Remove family member
export const removeFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const { touristId } = req.params;

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile to manage family");
  }

  // Find family
  const family = await Family.findOne({ primaryTouristId: currentTourist.touristId });
  if (!family) {
    throw new ApiError(404, "Family group not found");
  }

  // Remove member
  const memberIndex = family.members.findIndex(member => member.touristId === touristId);
  if (memberIndex === -1) {
    throw new ApiError(404, "Family member not found");
  }

  const removedMember = family.members[memberIndex];
  family.members.splice(memberIndex, 1);
  await family.save();

  // Also remove family connection from the target tourist
  await Tourist.findOneAndUpdate(
    { touristId },
    {
      $pull: {
        familyConnections: {
          familyId: currentTourist.touristId
        }
      }
    }
  );

  return res.status(200).json(
    new ApiResponse(200, family, "Family member removed successfully")
  );
});

// Get family details
export const getFamily = asyncHandler(async (req: Request, res: Response) => {
  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile to view family");
  }

  // Find family
  const family = await Family.findOne({ primaryTouristId: currentTourist.touristId });
  if (!family) {
    return res.status(200).json(
      new ApiResponse(200, null, "No family group found")
    );
  }

  return res.status(200).json(
    new ApiResponse(200, family, "Family details retrieved successfully")
  );
});

// Update family settings
export const updateFamilySettings = asyncHandler(async (req: Request, res: Response) => {
  const { familyName, shareLocation, emergencyNotifications } = req.body;

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile to manage family");
  }

  // Find and update family
  const family = await Family.findOne({ primaryTouristId: currentTourist.touristId });
  if (!family) {
    throw new ApiError(404, "Family group not found");
  }

  // Update fields if provided
  if (familyName !== undefined) family.familyName = familyName;
  if (shareLocation !== undefined) family.shareLocation = shareLocation;
  if (emergencyNotifications !== undefined) family.emergencyNotifications = emergencyNotifications;

  await family.save();

  return res.status(200).json(
    new ApiResponse(200, family, "Family settings updated successfully")
  );
});

// Update family member details
export const updateFamilyMember = asyncHandler(async (req: Request, res: Response) => {
  const { touristId } = req.params;
  const { relationship, emergencyContact } = req.body;

  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile to manage family");
  }

  // Find family
  const family = await Family.findOne({ primaryTouristId: currentTourist.touristId });
  if (!family) {
    throw new ApiError(404, "Family group not found");
  }

  // Find and update member
  const member = family.members.find(member => member.touristId === touristId);
  if (!member) {
    throw new ApiError(404, "Family member not found");
  }

  // Update fields if provided
  if (relationship !== undefined) member.relationship = relationship;
  if (emergencyContact !== undefined) member.emergencyContact = emergencyContact;

  await family.save();

  return res.status(200).json(
    new ApiResponse(200, family, "Family member updated successfully")
  );
});

// Get families where current user is a member (reverse lookup)
export const getFamiliesAsMember = asyncHandler(async (req: Request, res: Response) => {
  // Get current user's tourist profile
  const currentTourist = await Tourist.findOne({ userId: req.user?._id });
  if (!currentTourist || !currentTourist.touristId) {
    throw new ApiError(400, "You must have a verified tourist profile");
  }

  // Find families where current tourist is a member
  const families = await Family.find({
    "members.touristId": currentTourist.touristId
  }).populate('primaryUserId', 'name email');

  return res.status(200).json(
    new ApiResponse(200, families, "Families where you are a member retrieved successfully")
  );
});

// Search tourist by touristId (for adding to family)
export const searchTouristForFamily = asyncHandler(async (req: Request, res: Response) => {
  const { touristId } = req.params;

  const tourist = await Tourist.findOne({ touristId }).select('touristId fullName phoneNumber nationality isActive');
  
  if (!tourist) {
    throw new ApiError(404, "Tourist not found with this ID");
  }

  if (!tourist.isActive) {
    throw new ApiError(400, "This tourist profile is not active");
  }

  return res.status(200).json(
    new ApiResponse(200, tourist, "Tourist found")
  );
});
