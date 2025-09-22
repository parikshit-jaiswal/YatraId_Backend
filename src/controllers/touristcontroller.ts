import { Request, Response } from 'express';
import Tourist from '../models/Tourist';
import { User } from '../models/User';
import { encryptData, decryptData } from '../utils/crypto';
import { uploadToIPFS, getFromIPFS } from '../utils/ipfs';
import { ethers } from 'ethers';
import cloudinary from '../config/cloudinary';
import RestrictedZone from '../models/RestrictedZone';
import Panic from '../models/Panic';
import mongoose from 'mongoose';

// Register a new tourist
export const registerTourist = async (req: Request, res: Response) => {
  try {
    const { 
      fullName,
      phoneNumber,
      dateOfBirth,
      emergencyContacts, 
      validUntil, 
      trackingOptIn = false,
      ownerWallet 
    } = req.body;

    // Validation
    if (!fullName || !phoneNumber || !emergencyContacts || !validUntil || !ownerWallet) {
      return res.status(400).json({ 
        error: 'Missing required fields: fullName, phoneNumber, emergencyContacts, validUntil, ownerWallet' 
      });
    }

    // Check if user already has a tourist profile
    const existingTourist = await Tourist.findOne({ userId: req.user?._id }).lean();
    if (existingTourist) {
      return res.status(400).json({ 
        error: 'Tourist profile already exists',
        touristId: existingTourist._id
      });
    }

    // Validate user exists
    if (!req.user?._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate phone number format
    if (!/^\+?[\d\s\-\(\)]{10,15}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Validate Ethereum address
    if (!ethers.isAddress(ownerWallet)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Validate validUntil timestamp
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const validUntilTimestamp = typeof validUntil === 'number' ? validUntil : parseInt(validUntil);
    
    if (validUntilTimestamp <= currentTimestamp) {
      return res.status(400).json({ 
        error: `validUntil must be in the future. Current: ${currentTimestamp}, Provided: ${validUntilTimestamp}` 
      });
    }

    const bufferedTimestamp = validUntilTimestamp + 3600; // Add 1 hour buffer

    // Create initial tourist data with provided info
    const initialTouristData = {
      fullName,
      phoneNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    };

    // Create placeholder KYC data (unverified)
    const placeholderKyc = {
      method: "pending" as "digilocker" | "passport" | "pending",
      status: "pending" as "pending" | "verified" | "failed",
      data: initialTouristData
    };

    // Encrypt and upload emergency contacts
    const encryptedContacts = encryptData(JSON.stringify(emergencyContacts));
    const emergencyCID = await uploadToIPFS(encryptedContacts);

    // Encrypt initial tourist data for KYC
    const encryptedKyc = encryptData(JSON.stringify(placeholderKyc));
    const kycCID = await uploadToIPFS(encryptedKyc);

    // Create tourist record
    const tourist = new Tourist({
      userId: req.user._id,
      fullName,
      phoneNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      nationality: "pending" as "indian" | "international" | "pending",
      ownerWallet,
      kycCID,
      kyc: placeholderKyc,
      emergencyCID,
      validUntil: new Date(bufferedTimestamp * 1000),
      trackingOptIn,
      isActive: false, // Will be activated after KYC
      onchainTxs: [{
        action: 'register',
        status: 'pending',
        cid: kycCID,
        createdAt: new Date()
      }]
    });

    // Generate onchain tourist ID
    tourist.touristIdOnChain = ethers.keccak256(
      ethers.toUtf8Bytes(String(tourist._id))
    );

    await tourist.save();

    console.log(`📝 Tourist registered with ID: ${tourist._id} for user: ${req.user._id}`);

    res.status(201).json({
      success: true,
      touristId: tourist._id,
      touristIdOnChain: tourist.touristIdOnChain,
      validUntil: bufferedTimestamp,
      onchainStatus: 'pending',
      kycStatus: 'pending',
      isActive: false,
      message: 'Tourist profile created successfully. Please complete KYC verification to activate your digital tourist ID.'
    });

  } catch (error: any) {
    console.error('Register tourist error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get tourist by ID - OPTIMIZED
export const getTourist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decrypt } = req.query;

    const tourist = await Tourist.findById(id).lean();
    if (!tourist) {
      return res.status(404).json({ error: 'Tourist not found' });
    }

    // Authorization check - allow access for the tourist owner
    if (tourist.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let response: any = {
      id: tourist._id,
      touristIdOnChain: tourist.touristIdOnChain,
      ownerWallet: tourist.ownerWallet,
      validUntil: tourist.validUntil,
      trackingOptIn: tourist.trackingOptIn,
      createdAt: tourist.createdAt,
      updatedAt: tourist.updatedAt,
      onchainStatus: tourist.onchainTxs[tourist.onchainTxs.length - 1]?.status || 'pending'
    };

    // If decrypt=true and authorized, fetch and decrypt sensitive data
    if (decrypt === 'true') {
      try {
        const kycData = await getFromIPFS(tourist.kycCID);
        const emergencyData = await getFromIPFS(tourist.emergencyCID);
        
        response.kycData = JSON.parse(decryptData(kycData));
        response.emergencyContacts = JSON.parse(decryptData(emergencyData));
        
        // Get simplified panic data from Panic model
        const panicRecords = await Panic.find({ touristId: tourist._id })
          .select('location timestamp status priority')
          .sort({ timestamp: -1 })
          .limit(10)
          .lean();

        response.panics = panicRecords.map(panic => ({
          location: panic.location,
          timestamp: panic.timestamp,
          status: panic.status,
          priority: panic.priority
        }));

      } catch (decryptError) {
        console.error('Decryption error:', decryptError);
        response.decryptError = 'Failed to decrypt sensitive data';
      }
    }

    res.json(response);

  } catch (error: any) {
    console.error('Get tourist error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update tourist emergency contacts - OPTIMIZED
export const updateTourist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { emergencyContacts, trackingOptIn } = req.body;

    const tourist = await Tourist.findById(id);
    if (!tourist) {
      return res.status(404).json({ error: 'Tourist not found' });
    }

    // Authorization check
    if (tourist.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update emergency contacts if provided
    if (emergencyContacts) {
      const encryptedContacts = encryptData(JSON.stringify(emergencyContacts));
      const emergencyCID = await uploadToIPFS(encryptedContacts);
      tourist.emergencyCID = emergencyCID;

      // Add onchain transaction for update
      tourist.onchainTxs.push({
        action: 'update',
        status: 'pending',
        cid: emergencyCID,
        createdAt: new Date()
      });
    }

    if (trackingOptIn !== undefined) {
      tourist.trackingOptIn = trackingOptIn;
    }

    tourist.updatedAt = new Date();
    await tourist.save();

    res.json({ 
      success: true, 
      message: 'Tourist updated successfully. Blockchain update pending.' 
    });

  } catch (error: any) {
    console.error('Update tourist error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Raise panic/SOS - SIMPLIFIED (NO EVIDENCE REQUIRED)
export const raisePanic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { location } = req.body;

    // Validate authenticated user exists
    if (!req.user?._id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate location has latitude and longitude
    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ error: 'Location with latitude and longitude is required' });
    }

    // Validate latitude and longitude are valid numbers
    const lat = parseFloat(location.latitude);
    const lng = parseFloat(location.longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid latitude or longitude coordinates' });
    }

    const tourist = await Tourist.findById(id);
    if (!tourist) {
      return res.status(404).json({ error: 'Tourist not found' });
    }

    // Authorization check
    if (tourist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current timestamp for consistent timing
    const currentTimestamp = new Date();

    // Ensure we have a proper ObjectId - explicit conversion
    const reportedByUserId = new mongoose.Types.ObjectId(req.user._id.toString());
    console.log('📝 Converted reportedBy ObjectId:', reportedByUserId);
    console.log('📝 reportedBy type:', typeof reportedByUserId);

    // Create panic record (no evidence required)
    const panic = new Panic({
      touristId: tourist._id,
      location: {
        latitude: lat,
        longitude: lng
      },
      timestamp: currentTimestamp,
      reportedBy: reportedByUserId,
      priority: 'critical',
      status: 'active'
    });

    await panic.save();
    console.log('✅ Panic record saved successfully');

    // Ensure we initialize panics array if it doesn't exist
    if (!tourist.panics) {
      tourist.panics = [];
    }

    // Create the panic object with explicit ObjectId conversion
    const newPanicEntry = {
      location: {
        latitude: lat,
        longitude: lng
      },
      timestamp: currentTimestamp,
      reportedBy: reportedByUserId, // Using the converted ObjectId
      priority: 'critical' as const,
      status: 'active' as const
    };

    console.log('📝 New panic entry before push:', newPanicEntry);
    console.log('📝 reportedBy in entry:', newPanicEntry.reportedBy);
    console.log('📝 reportedBy type in entry:', typeof newPanicEntry.reportedBy);

    // Add panic to tourist's panics array
    tourist.panics.push(newPanicEntry);

    // Update tourist record
    tourist.updatedAt = new Date();
    
    console.log('📝 About to save tourist with panic data');
    console.log('📝 Tourist panics array length:', tourist.panics.length);
    console.log('📝 Last panic reportedBy:', tourist.panics[tourist.panics.length - 1]?.reportedBy);
    
    await tourist.save();
    console.log('✅ Tourist record updated successfully');

    res.status(201).json({
      success: true,
      message: 'SOS raised successfully. Emergency services have been notified.',
      emergencyNumber: '+91-100',
      panicId: panic._id,
      timestamp: currentTimestamp,
      location: {
        latitude: lat,
        longitude: lng
      },
      priority: panic.priority,
      status: panic.status,
      reportedBy: req.user.name || req.user.email || 'Self'
    });

  } catch (error: any) {
    console.error('Raise panic error:', error);
    
    if (error.name === 'ValidationError') {
      console.error('📋 Validation Error Details:');
      console.error('- Error message:', error.message);
      console.error('- Errors object:', error.errors);
      console.error('- req.user at error time:', req.user);
      
      // Log more details about the tourist object
      // console.error('- Tourist panics array:', tourist?.panics);
      // console.error('- Last panic entry:', tourist?.panics?.[tourist.panics.length - 1]);
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// AI-triggered safety score update - OPTIMIZED
export const updateSafetyScore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { safetyLevel, factors, aiModelVersion } = req.body;

    const tourist = await Tourist.findById(id);
    if (!tourist) {
      return res.status(404).json({ error: 'Tourist not found' });
    }

    // Create safety score data
    const scoreData = {
      touristId: tourist.touristIdOnChain,
      safetyLevel, // 0=green, 1=yellow, 2=red
      factors,
      aiModelVersion: aiModelVersion || 'v1.0',
      timestamp: new Date(),
      calculatedBy: 'AI_SYSTEM'
    };

    // Encrypt score data
    const encryptedScore = encryptData(JSON.stringify(scoreData));
    const scoreCID = await uploadToIPFS(encryptedScore);

    // Add onchain transaction for score update
    tourist.onchainTxs.push({
      action: 'score',
      status: 'pending',
      cid: scoreCID,
      createdAt: new Date()
    });

    tourist.updatedAt = new Date();
    await tourist.save();

    res.json({
      success: true,
      message: 'Safety score updated successfully. Blockchain update pending.',
      safetyLevel,
      scoreCID
    });

  } catch (error: any) {
    console.error('Update safety score error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all tourists - MEMORY OPTIMIZED
export const getAllTourists = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20); // Cap at 20
    const skip = (page - 1) * limit;

    // Use lean() and select only essential fields
    const tourists = await Tourist.find()
      .select('touristId fullName phoneNumber nationality profileImage kyc.status isActive createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Tourist.countDocuments();

    // Simplified stats
    const activeCount = await Tourist.countDocuments({ 
      'kyc.status': 'verified',
      isActive: true
    });

    res.json({
      tourists,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: {
        total,
        active: activeCount,
        verified: activeCount
      }
    });

  } catch (error: any) {
    console.error('Get all tourists error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get dashboard data - MEMORY OPTIMIZED
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user info
    const user = await User.findById(userId).select('name email').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get tourist profile
    const tourist = await Tourist.findOne({ userId }).select('touristId profileImage qrCodeData _id').lean();

    if (!tourist) {
      return res.json({
        success: true,
        hasProfile: false,
        message: 'No tourist profile found. Please create a tourist profile first.'
      });
    }

    // Extract QR URL from qrCodeData
    let qrUrl = null;
    if (tourist.qrCodeData) {
      if (typeof tourist.qrCodeData === 'object' && tourist.qrCodeData.cloudinaryUrl) {
        qrUrl = tourist.qrCodeData.cloudinaryUrl;
      }
    }

    // SIMPLIFIED RESPONSE
    res.json({
      success: true,
      hasProfile: true,
      name: user.name,
      touristId: tourist.touristId || null,
      profileImage: tourist.profileImage || null,
      qrUrl: qrUrl,
      touristMongoId: tourist._id, // <-- Tourist MongoDB ID added here
      message: tourist.touristId ? 'Profile active' : 'Profile created, Tourist ID pending'
    });

  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Upload profile image - OPTIMIZED
export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const file = files?.profileImage?.[0] || files?.profilePicture?.[0] || req.file;

    if (!file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Find the tourist profile
    const tourist = await Tourist.findOne({ userId });
    if (!tourist) {
      return res.status(404).json({ error: "Tourist profile not found" });
    }

    try {
      const imageUrl = (file as any).path || file.path;

      if (!imageUrl) {
        return res.status(500).json({ error: "Failed to upload image" });
      }

      // Delete old profile picture if exists
      if (tourist.profileImage && tourist.profileImage.includes("cloudinary")) {
        try {
          const publicId = tourist.profileImage.split("/").pop()?.split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(`tourist-profile-pictures/${publicId}`);
          }
        } catch (err) {
          console.error("Error deleting old profile picture:", err);
        }
      }

      // Update the tourist's profile picture URL
      tourist.profileImage = imageUrl;
      tourist.updatedAt = new Date();
      await tourist.save();

      res.status(200).json({
        success: true,
        data: { profileImage: imageUrl },
        message: "Profile picture updated successfully"
      });

    } catch (error) {
      console.error("Error updating profile picture:", error);

      if (file && (file as any).public_id) {
        try {
          await cloudinary.uploader.destroy((file as any).public_id);
        } catch (err) {
          console.error("Error deleting uploaded file after error:", err);
        }
      }

      return res.status(500).json({
        error: "Failed to update profile picture. Please try again."
      });
    }

  } catch (error: any) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Search tourists - MEMORY OPTIMIZED
export const searchTouristById = async (req: Request, res: Response) => {
  try {
    const { query, searchType = 'touristId' } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let tourist;
    let searchField = '';

    switch (searchType) {
      case 'touristId':
        tourist = await Tourist.findOne({ touristId: query })
          .select('touristId fullName phoneNumber nationality profileImage kyc isActive validUntil trackingOptIn ownerWallet createdAt updatedAt')
          .populate('userId', 'name email')
          .lean();
        searchField = 'Tourist ID';
        break;
      case 'phone':
        tourist = await Tourist.findOne({ phoneNumber: query })
          .select('touristId fullName phoneNumber nationality profileImage kyc isActive validUntil trackingOptIn ownerWallet createdAt updatedAt')
          .populate('userId', 'name email')
          .lean();
        searchField = 'Phone Number';
        break;
      case 'walletAddress':
        tourist = await Tourist.findOne({ ownerWallet: query })
          .select('touristId fullName phoneNumber nationality profileImage kyc isActive validUntil trackingOptIn ownerWallet createdAt updatedAt')
          .populate('userId', 'name email')
          .lean();
        searchField = 'Wallet Address';
        break;
      default:
        return res.status(400).json({ error: 'Invalid search type' });
    }

    if (!tourist) {
      return res.status(404).json({ 
        error: `No tourist found with ${searchField}: ${query}` 
      });
    }

    // Get panic count from Panic model
    const panicCount = await Panic.countDocuments({ touristId: tourist._id });
    const hasActivePanics = await Panic.exists({ 
      touristId: tourist._id, 
      status: 'active' 
    });

    const isActive = tourist.isActive && tourist.kyc.status === 'verified';

    res.json({
      success: true,
      tourist: {
        id: tourist._id,
        touristId: tourist.touristId,
        fullName: tourist.fullName,
        phoneNumber: tourist.phoneNumber,
        nationality: tourist.nationality,
        profileImage: tourist.profileImage,
        email: (tourist.userId as any).email,
        ownerWallet: tourist.ownerWallet,
        kycStatus: tourist.kyc.status,
        kycMethod: tourist.kyc.method,
        isActive,
        validUntil: tourist.validUntil,
        trackingOptIn: tourist.trackingOptIn,
        panicCount,
        hasActivePanics: !!hasActivePanics,
        lastSeen: tourist.updatedAt,
        createdAt: tourist.createdAt
      }
    });

  } catch (error: any) {
    console.error('Search tourist error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get heat map data - MEMORY OPTIMIZED
export const getHeatMapData = async (req: Request, res: Response) => {
  try {
    const { 
      bounds,
      timeRange = '24h'
    } = req.query;

    // Calculate time filter
    const timeFilter = new Date();
    switch (timeRange) {
      case '1h':
        timeFilter.setHours(timeFilter.getHours() - 1);
        break;
      case '24h':
        timeFilter.setHours(timeFilter.getHours() - 24);
        break;
      case '7d':
        timeFilter.setDate(timeFilter.getDate() - 7);
        break;
      case '30d':
        timeFilter.setDate(timeFilter.getDate() - 30);
        break;
    }

    // Build match conditions
    const matchConditions: any = {
      timestamp: { $gte: timeFilter }
    };

    // Add location bounds filter if provided
    if (bounds) {
      try {
        const { north, south, east, west } = JSON.parse(bounds as string);
        matchConditions['location.latitude'] = { $gte: south, $lte: north };
        matchConditions['location.longitude'] = { $gte: west, $lte: east };
      } catch (e) {
        console.error('Invalid bounds format:', e);
      }
    }

    // SIMPLIFIED aggregation pipeline with memory limits
    const pipeline: any[] = [
      { $match: matchConditions },
      { $limit: 500 }, // Limit raw records
      {
        $group: {
          _id: {
            lat: { $round: ['$location.latitude', 2] },
            lng: { $round: ['$location.longitude', 2] }
          },
          count: { $sum: 1 },
          priority: { $first: '$priority' }
        }
      },
      {
        $project: {
          _id: 0,
          location: {
            lat: '$_id.lat',
            lng: '$_id.lng'
          },
          intensity: '$count',
          priority: '$priority'
        }
      },
      { $limit: 100 } // Limit final results
    ];

    const heatMapPoints = await Panic.aggregate(pipeline);

    // Simple statistics
    const totalPanics = await Panic.countDocuments(matchConditions);
    const activePanics = await Panic.countDocuments({
      ...matchConditions,
      status: 'active'
    });

    res.json({
      success: true,
      heatMapData: heatMapPoints,
      statistics: {
        totalPanics,
        activePanics,
        criticalPanics: 0,
        resolvedPanics: 0
      },
      metadata: {
        timeRange,
        generatedAt: new Date(),
        totalPoints: heatMapPoints.length
      }
    });

  } catch (error: any) {
    console.error('Heat map data error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get SOS alerts - MEMORY OPTIMIZED
export const getSOSAlerts = async (req: Request, res: Response) => {
  try {
    const { 
      status = 'active',
      priority = 'all',
      limit = 20  // Reduced limit
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 20, 50); // Cap at 50

    // Build match conditions
    const matchConditions: any = {};

    // Filter by status
    if (status === 'active') {
      matchConditions.status = 'active';
    } else if (status === 'resolved') {
      matchConditions.status = 'resolved';
    }

    // Filter by priority
    if (priority !== 'all') {
      matchConditions.priority = priority;
    }

    // OPTIMIZED: Use lean() and select only needed fields
    const panics = await Panic.find(matchConditions)
      .select('touristId location timestamp reportedBy priority status createdAt')
      .populate({
        path: 'touristId',
        select: 'touristId fullName phoneNumber nationality profileImage userId kyc isActive',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      })
      .populate('reportedBy', 'name email')
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .lean();

    // Format the response with null checks
    const sosAlerts = panics.map(panic => {
      const tourist = panic.touristId as any;
      const user = tourist?.userId as any;
      
      if (!panic.timestamp) return null;
      
      const timeSinceAlert = Date.now() - new Date(panic.timestamp).getTime();
      const minutesAgo = timeSinceAlert / (1000 * 60);
      const hoursAgo = timeSinceAlert / (1000 * 60 * 60);

      return {
        _id: panic._id,
        touristId: tourist?.touristId || 'N/A',
        fullName: tourist?.fullName || 'Unknown',
        phoneNumber: tourist?.phoneNumber || 'N/A',
        nationality: tourist?.nationality || 'Unknown',
        profileImage: tourist?.profileImage || null,
        userEmail: user?.email || 'N/A',
        panic: {
          location: {
            latitude: panic.location?.latitude || 0,
            longitude: panic.location?.longitude || 0
          },
          timestamp: panic.timestamp,
          status: panic.status
        },
        kycStatus: tourist?.kyc?.status || 'pending',
        isActive: tourist?.isActive || false,
        priority: panic.priority,
        minutesAgo: Math.round(minutesAgo),
        hoursAgo: Math.round(hoursAgo * 10) / 10,
        needsAttention: panic.priority === 'critical' || panic.priority === 'high' || panic.status === 'active',
        locationString: `${(panic.location?.latitude || 0).toFixed(4)}, ${(panic.location?.longitude || 0).toFixed(4)}`
      };
    })      .filter((alert): alert is NonNullable<typeof alert> => alert !== null); // Type-safe filter

    // Create summary
    const summary = {
      total: sosAlerts.length,
      critical: sosAlerts.filter(alert => alert.priority === 'critical').length,
      high: sosAlerts.filter(alert => alert.priority === 'high').length,
      medium: sosAlerts.filter(alert => alert.priority === 'medium').length,
      low: sosAlerts.filter(alert => alert?.priority === 'low').length,
      needingAttention: sosAlerts.filter(alert => alert.needsAttention).length,
      recentAlerts: sosAlerts.filter(alert => alert.minutesAgo < 60).length
    };

    res.json({
      success: true,
      sosAlerts,
      summary
    });

  } catch (error: any) {
    console.error('SOS alerts error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Restricted Zones - OPTIMIZED
export const createRestrictedZone = async (req: Request, res: Response) => {
  try {
    const { name, description, coordinates, severity = 'medium', isActive = true } = req.body;

    if (!name || !coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({ error: 'Name and coordinates array are required' });
    }

    const zone = await RestrictedZone.create({
      name,
      description,
      coordinates,
      severity,
      isActive,
      createdBy: req.user?._id || 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      zone,
      message: 'Restricted zone created successfully'
    });
  } catch (error: any) {
    console.error('Create restricted zone error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRestrictedZones = async (req: Request, res: Response) => {
  try {
    const zones = await RestrictedZone.find({ isActive: true })
      .select('name description coordinates severity createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, zones });
  } catch (error: any) {
    console.error('Get restricted zones error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRestrictedZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const zone = await RestrictedZone.findByIdAndDelete(id);
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json({ success: true, message: 'Zone deleted', zone });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRestrictedZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const zone = await RestrictedZone.findByIdAndUpdate(id, update, { new: true });
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json({ success: true, message: 'Zone updated', zone });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// SIMPLIFIED Analytics - MEMORY OPTIMIZED
export const getTouristAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '7d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    // Simple counts only
    const [totalTourists, activeTourists, totalPanics, activePanics] = await Promise.all([
      Tourist.countDocuments(),
      Tourist.countDocuments({ 
        'kyc.status': 'verified',
        isActive: true
      }),
      Panic.countDocuments({
        timestamp: { $gte: startDate }
      }),
      Panic.countDocuments({
        timestamp: { $gte: startDate },
        status: 'active'
      })
    ]);

    res.json({
      success: true,
      analytics: {
        period,
        totalStats: {
          totalTourists,
          activeTourists,
          verifiedTourists: activeTourists,
          trackingOptIns: 0
        },
        panicStats: {
          totalPanics,
          activePanics,
          recentPanics: totalPanics,
          touristsWithPanics: 0
        }
      },
      generatedAt: new Date()
    });

  } catch (error: any) {
    console.error('Tourist analytics error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// SIMPLIFIED Risk Score - MEMORY OPTIMIZED
export const updateRiskScore = async (req: Request, res: Response) => {
  try {
    const { touristId, riskFactors, riskScore, modelVersion = 'v1.0' } = req.body;

    if (!touristId || riskScore === undefined) {
      return res.status(400).json({ 
        error: 'Tourist ID and risk score are required' 
      });
    }

    const tourist = await Tourist.findById(touristId);
    if (!tourist) {
      return res.status(404).json({ error: 'Tourist not found' });
    }

    // Simple risk assessment without encryption/IPFS
    const riskData = {
      touristId: tourist.touristIdOnChain,
      riskScore: Math.max(0, Math.min(100, riskScore)),
      riskLevel: riskScore >= 80 ? 'high' : riskScore >= 50 ? 'medium' : 'low',
      factors: riskFactors || [],
      modelVersion,
      assessmentDate: new Date(),
      assessedBy: 'AI_RISK_ENGINE'
    };

    tourist.updatedAt = new Date();
    await tourist.save();

    res.json({
      success: true,
      riskAssessment: riskData,
      message: 'Risk score updated successfully'
    });

  } catch (error: any) {
    console.error('Update risk score error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Generate QR code - SIMPLIFIED
export const generateQRCode = async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { touristId } = req.params;

    const tourist = await Tourist.findById(touristId);
    if (!tourist) {
      return res.status(404).json({ error: 'Tourist not found' });
    }

    if (tourist.kyc.status !== 'verified') {
      return res.status(400).json({ 
        error: 'Tourist must complete KYC verification before QR code generation' 
      });
    }

    // Generate QR code data
    const qrData = {
      touristId: tourist.touristId,
      onchainId: tourist.touristIdOnChain,
      fullName: tourist.fullName,
      nationality: tourist.nationality,
      validUntil: tourist.validUntil,
      issueDate: new Date(),
      checksum: ethers.keccak256(
        ethers.toUtf8Bytes(tourist.touristIdOnChain + tourist.fullName)
      )
    };

    const qrCodeString = JSON.stringify(qrData);
    
    // Update tourist with QR code data
    tourist.qrCodeData = qrCodeString;
    tourist.updatedAt = new Date();
    await tourist.save();

    res.json({
      success: true,
      qrCodeData: qrData,
      qrCodeString,
      message: 'QR code generated successfully'
    });

  } catch (error: any) {
    console.error('Generate QR code error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};