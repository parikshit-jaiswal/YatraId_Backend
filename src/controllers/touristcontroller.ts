import { Request, Response } from 'express';
import Tourist from '../models/Tourist';
import { User } from '../models/User';
import { encryptData, decryptData } from '../utils/crypto';
import { uploadToIPFS, getFromIPFS } from '../utils/ipfs';
import { ethers } from 'ethers';
import cloudinary from '../config/cloudinary';
import RestrictedZone from '../models/RestrictedZone';

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
    const existingTourist = await Tourist.findOne({ userId: req.user?._id });
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

// Get tourist by ID
export const getTourist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { decrypt } = req.query;

    const tourist = await Tourist.findById(id);
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
        
        // Include panic data if exists
        if (tourist.panics && tourist.panics.length > 0) {
          response.panics = await Promise.all(
            tourist.panics.map(async (panic) => {
              let evidence = null;
              if (panic.evidenceCID) {
                try {
                  const evidenceData = await getFromIPFS(panic.evidenceCID);
                  evidence = JSON.parse(decryptData(evidenceData));
                } catch (e) {
                  console.error('Error decrypting panic evidence:', e);
                }
              }
              
              return {
                location: panic.location,
                timestamp: panic.timestamp,
                evidence,
                onchainStatus: panic.onchainStatus
              };
            })
          );
        }
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

// Update tourist emergency contacts
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

// Raise panic/SOS
export const raisePanic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { location, evidence, description } = req.body;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const tourist = await Tourist.findById(id);
    if (!tourist) {
      return res.status(404).json({ error: 'Tourist not found' });
    }

    // Authorization check
    if (tourist.userId.toString() !== req.user?._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create comprehensive panic data
    const panicData = {
      location,
      evidence,
      description,
      timestamp: new Date(),
      reportedBy: req.user._id,
      deviceInfo: req.headers['user-agent'],
      urgencyLevel: 'high'
    };

    // Encrypt panic data
    const encryptedPanic = encryptData(JSON.stringify(panicData));
    const evidenceCID = await uploadToIPFS(encryptedPanic);

    // Add panic record
    const panicRecord = {
      location,
      timestamp: new Date(),
      evidenceCID,
      onchainStatus: "pending" as "pending"
    };

    if (!tourist.panics) {
      tourist.panics = [];
    }
    tourist.panics.push(panicRecord);

    // Add onchain transaction
    tourist.onchainTxs.push({
      action: 'panic',
      status: 'pending',
      cid: evidenceCID,
      createdAt: new Date()
    });

    tourist.updatedAt = new Date();
    await tourist.save();

    res.status(201).json({
      success: true,
      message: 'SOS raised successfully. Emergency services have been notified.',
      emergencyNumber: '+91-100'
    });

  } catch (error: any) {
    console.error('Raise panic error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// AI-triggered safety score update
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

// Get all tourists (dashboard)
export const getAllTourists = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const tourists = await Tourist.find()
      .select('-panics.evidenceCID') // Exclude sensitive data
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Tourist.countDocuments();

    // Add summary stats for dashboard
    const activeCount = await Tourist.countDocuments({ 
      validUntil: { $gt: new Date() },
      'onchainTxs.status': 'confirmed'
    });
    
    const panicCount = await Tourist.countDocuments({ 
      'panics.0': { $exists: true } 
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
        withPanics: panicCount
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

// Get dashboard data for user
export const getDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id; // Changed from req.user?.id
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user info
    const user = await User.findById(userId).select('name email kycStatus kycType walletAddress');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get tourist profile
    const tourist = await Tourist.findOne({ userId });

    if (!tourist) {
      return res.json({
        success: true,
        user: {
          name: user.name,
          email: user.email,
          walletAddress: user.walletAddress,
          kycStatus: user.kycStatus,
          kycType: user.kycType
        },
        tourist: null,
        hasProfile: false,
        message: 'No tourist profile found. Please create a tourist profile first.'
      });
    }

    // Analyze blockchain status properly
    const { overallStatus, isRegistered, latestTx, canUseBlockchain } = analyzeBlockchainStatus(tourist.onchainTxs);
    
    // Count panics
    const panicCount = tourist.panics?.length || 0;
    const activePanics = tourist.panics?.filter(p => 
      p.onchainStatus === 'pending' || p.onchainStatus === 'submitted'
    ).length || 0;

    // Determine user message
    let message = 'Profile active';
    if (tourist.kyc.status === 'pending') {
      message = 'Please complete KYC verification to activate your profile.';
    } else if (!isRegistered) {
      message = 'Blockchain registration in progress. Please wait.';
    } else if (tourist.kyc.status === 'verified' && isRegistered) {
      message = 'Profile fully active and registered on blockchain.';
    }

    res.json({
      success: true,
      user: {
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        kycStatus: user.kycStatus,
        kycType: user.kycType
      },
      tourist: {
        id: tourist._id,
        touristIdOnChain: tourist.touristIdOnChain,
        nationality: tourist.nationality,
        validUntil: tourist.validUntil,
        trackingOptIn: tourist.trackingOptIn,
        kycStatus: tourist.kyc.status,
        onchainStatus: overallStatus, // Use analyzed status
        isRegisteredOnChain: isRegistered, // Clear indicator
        canUseBlockchain, // Can use blockchain features
        lastTxHash: latestTx?.txHash,
        lastSuccessfulTxHash: getLastSuccessfulTxHash(tourist.onchainTxs),
        panicCount,
        activePanics,
        createdAt: tourist.createdAt,
        updatedAt: tourist.updatedAt
      },
      hasProfile: true,
      canCompleteKyc: tourist.kyc.status === 'pending',
      blockchainDetails: {
        totalTransactions: tourist.onchainTxs.length,
        successfulTransactions: tourist.onchainTxs.filter(tx => tx.status === 'confirmed').length,
        failedTransactions: tourist.onchainTxs.filter(tx => tx.status === 'failed').length,
        pendingTransactions: tourist.onchainTxs.filter(tx => tx.status === 'pending' || tx.status === 'submitted').length
      },
      message
    });

  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Upload profile image for tourist
export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Handle both field names - FIXED
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const file = files?.profileImage?.[0] || files?.profilePicture?.[0] || req.file;

    console.log('Files received:', files);
    console.log('File received:', file);
    
    if (!file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Find the tourist profile
    const tourist = await Tourist.findOne({ userId });
    if (!tourist) {
      return res.status(404).json({ error: "Tourist profile not found" });
    }

    try {
      // The file has already been uploaded to Cloudinary by the middleware
      const imageUrl = (file as any).path || file.path;

      if (!imageUrl) {
        return res.status(500).json({ error: "Failed to upload image" });
      }

      // If tourist already has a profile picture in Cloudinary, delete the old one
      if (tourist.profileImage && tourist.profileImage.includes("cloudinary")) {
        try {
          // Extract the public ID from the Cloudinary URL
          const publicId = tourist.profileImage.split("/").pop()?.split(".")[0];

          if (publicId) {
            await cloudinary.uploader.destroy(`tourist-profile-pictures/${publicId}`);
          }
        } catch (err) {
          console.error("Error deleting old profile picture:", err);
          // Continue even if deletion fails
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

      // Clean up the uploaded file in case of error
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

// Helper function to analyze blockchain status
function analyzeBlockchainStatus(onchainTxs: any[]) {
  if (!onchainTxs || onchainTxs.length === 0) {
    return {
      overallStatus: 'not_started',
      isRegistered: false,
      latestTx: null,
      canUseBlockchain: false
    };
  }

  // Check if registration is confirmed
  const registerTx = onchainTxs.find(tx => tx.action === 'register' && tx.status === 'confirmed');
  const isRegistered = !!registerTx;

  // Get latest transaction
  const latestTx = onchainTxs[onchainTxs.length - 1];

  // Determine overall status
  let overallStatus = 'pending';
  
  if (isRegistered) {
    // If registered, check if there are any pending updates
    const pendingTxs = onchainTxs.filter(tx => 
      tx.status === 'pending' || tx.status === 'submitted'
    );
    
    if (pendingTxs.length > 0) {
      overallStatus = 'updating';
    } else {
      // Check if latest non-register transaction failed
      const latestNonRegisterTx = [...onchainTxs]
        .reverse()
        .find(tx => tx.action !== 'register');
        
      if (latestNonRegisterTx && latestNonRegisterTx.status === 'failed') {
        overallStatus = 'update_failed';
      } else {
        overallStatus = 'active';
      }
    }
  } else {
    // Not registered yet
    const registerPending = onchainTxs.some(tx => 
      tx.action === 'register' && (tx.status === 'pending' || tx.status === 'submitted')
    );
    
    if (registerPending) {
      overallStatus = 'registering';
    } else {
      overallStatus = 'registration_failed';
    }
  }

  return {
    overallStatus,
    isRegistered,
    latestTx,
    canUseBlockchain: isRegistered // Can use blockchain if successfully registered
  };
}

// Helper function to get last successful transaction hash
function getLastSuccessfulTxHash(onchainTxs: any[]): string | null {
  const successfulTx = [...onchainTxs]
    .reverse()
    .find(tx => tx.status === 'confirmed');
    
  return successfulTx?.txHash || null;
}

// ============= ADVANCED ADMIN FEATURES =============

// Search tourists by Tourist ID or QR scan
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
        tourist = await Tourist.findOne({ touristId: query }).populate('userId', 'name email');
        searchField = 'Tourist ID';
        break;
      case 'qrCode':
        tourist = await Tourist.findOne({ qrCodeData: query }).populate('userId', 'name email');
        searchField = 'QR Code';
        break;
      case 'phone':
        tourist = await Tourist.findOne({ phoneNumber: query }).populate('userId', 'name email');
        searchField = 'Phone Number';
        break;
      case 'walletAddress':
        tourist = await Tourist.findOne({ ownerWallet: query }).populate('userId', 'name email');
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

    // Get location history from panic records
    const locationHistory = tourist.panics?.map(panic => ({
      location: panic.location,
      timestamp: panic.timestamp,
      type: 'panic'
    })) || [];

    // Calculate current status
    const isActive = tourist.isActive && tourist.kyc.status === 'verified';
    const hasActivePanics = tourist.panics?.some(p => 
      p.onchainStatus === 'pending' || p.onchainStatus === 'submitted'
    ) || false;

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
        panicCount: tourist.panics?.length || 0,
        hasActivePanics,
        locationHistory,
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

// Get heat map data for dashboard
export const getHeatMapData = async (req: Request, res: Response) => {
  try {
    const { 
      bounds, // { north, south, east, west }
      dataType = 'all', // 'all', 'tourists', 'sos', 'help'
      timeRange = '24h' // '1h', '24h', '7d', '30d'
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

    // Build aggregation pipeline for heat map data
    const pipeline: any[] = [
      {
        $match: {
          updatedAt: { $gte: timeFilter }
        }
      }
    ];

    // Add location bounds filter if provided
    if (bounds) {
      const { north, south, east, west } = JSON.parse(bounds as string);
      pipeline[0].$match['panics.location.latitude'] = { $gte: south, $lte: north };
      pipeline[0].$match['panics.location.longitude'] = { $gte: west, $lte: east };
    }

    // Unwind panics to get individual location points
    pipeline.push(
      { $unwind: { path: '$panics', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'panics.timestamp': { $gte: timeFilter }
        }
      }
    );

    // Group by location to create clusters
    pipeline.push({
      $group: {
        _id: {
          lat: { $round: ['$panics.location.latitude', 3] }, // Round to ~100m precision
          lng: { $round: ['$panics.location.longitude', 3] }
        },
        count: { $sum: 1 },
        incidents: { $push: {
          touristId: '$touristId',
          timestamp: '$panics.timestamp',
          status: '$panics.onchainStatus'
        }}
      }
    });

    // Format output
    pipeline.push({
      $project: {
        _id: 0,
        location: {
          lat: '$_id.lat',
          lng: '$_id.lng'
        },
        intensity: '$count',
        incidents: '$incidents'
      }
    });

    const heatMapPoints = await Tourist.aggregate(pipeline);

    // Get additional statistics
    const stats = await Tourist.aggregate([
      {
        $match: {
          updatedAt: { $gte: timeFilter }
        }
      },
      {
        $group: {
          _id: null,
          totalTourists: { $sum: 1 },
          activeTourists: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$isActive', true] },
                  { $eq: ['$kyc.status', 'verified'] }
                ]}, 
                1, 
                0
              ]
            }
          },
          sosCount: {
            $sum: { $size: { $ifNull: ['$panics', []] } }
          },
          trackingOptIns: {
            $sum: {
              $cond: [{ $eq: ['$trackingOptIn', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      heatMapData: heatMapPoints,
      statistics: stats[0] || {
        totalTourists: 0,
        activeTourists: 0,
        sosCount: 0,
        trackingOptIns: 0
      },
      metadata: {
        timeRange,
        dataType,
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

// Get real-time SOS alerts for dashboard
export const getSOSAlerts = async (req: Request, res: Response) => {
  try {
    const { 
      status = 'active', // 'active', 'all', 'resolved'
      priority = 'all', // 'high', 'medium', 'low', 'all'
      limit = 50 
    } = req.query;

    // Build match conditions
    const matchConditions: any = {
      'panics.0': { $exists: true } // Has at least one panic
    };

    // Filter by status
    if (status === 'active') {
      matchConditions['panics.onchainStatus'] = { $in: ['pending', 'submitted'] };
    } else if (status === 'resolved') {
      matchConditions['panics.onchainStatus'] = 'confirmed';
    }

    // Aggregation pipeline to get SOS alerts
    const pipeline: any[] = [
      { $match: matchConditions },
      { $unwind: '$panics' },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          _id: 1,
          touristId: 1,
          fullName: 1,
          phoneNumber: 1,
          nationality: 1,
          profileImage: 1,
          userEmail: '$userInfo.email',
          panic: '$panics',
          kycStatus: '$kyc.status',
          isActive: 1
        }
      },
      { $sort: { 'panic.timestamp': -1 } },
      { $limit: parseInt(limit as string) }
    ];

    const sosAlerts = await Tourist.aggregate(pipeline);

    // Calculate priority based on time and status
    const enrichedAlerts = sosAlerts.map(alert => {
      const timeSinceAlert = Date.now() - new Date(alert.panic.timestamp).getTime();
      const hoursAgo = timeSinceAlert / (1000 * 60 * 60);
      
      let priorityLevel = 'low';
      if (hoursAgo < 1) priorityLevel = 'high';
      else if (hoursAgo < 6) priorityLevel = 'medium';

      return {
        ...alert,
        priority: priorityLevel,
        hoursAgo: Math.round(hoursAgo * 10) / 10,
        needsAttention: priorityLevel === 'high' || alert.panic.onchainStatus === 'pending'
      };
    });

    // Filter by priority if specified
    let filteredAlerts = enrichedAlerts;
    if (priority !== 'all') {
      filteredAlerts = enrichedAlerts.filter(alert => alert.priority === priority);
    }

    res.json({
      success: true,
      sosAlerts: filteredAlerts,
      summary: {
        total: filteredAlerts.length,
        high: filteredAlerts.filter(a => a.priority === 'high').length,
        medium: filteredAlerts.filter(a => a.priority === 'medium').length,
        low: filteredAlerts.filter(a => a.priority === 'low').length,
        needingAttention: filteredAlerts.filter(a => a.needsAttention).length
      }
    });

  } catch (error: any) {
    console.error('SOS alerts error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Restricted Zones Management - will be extended with actual zone data later
export const createRestrictedZone = async (req: Request, res: Response) => {
  try {
    const { name, description, coordinates, severity = 'medium', isActive = true } = req.body;

    if (!name || !coordinates || !Array.isArray(coordinates)) {
      return res.status(400).json({ error: 'Name and coordinates array are required' });
    }

    // Actually save to MongoDB!
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

// Get tourist analytics for dashboard
export const getTouristAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '7d' } = req.query; // '24h', '7d', '30d', '3m'

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
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }

    // Aggregate analytics data
    const [
      totalStats,
      registrationTrend,
      kycStats,
      nationalityBreakdown,
      panicStats
    ] = await Promise.all([
      // Total statistics
      Tourist.aggregate([
        {
          $group: {
            _id: null,
            totalTourists: { $sum: 1 },
            activeTourists: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$isActive', true] },
                    { $eq: ['$kyc.status', 'verified'] }
                  ]}, 
                  1, 
                  0
                ]
              }
            },
            verifiedTourists: {
              $sum: {
                $cond: [{ $eq: ['$kyc.status', 'verified'] }, 1, 0]
              }
            },
            trackingOptIns: {
              $sum: {
                $cond: [{ $eq: ['$trackingOptIn', true] }, 1, 0]
              }
            }
          }
        }
      ]),

      // Registration trend over time
      Tourist.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: period === '24h' ? '%H:00' : '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // KYC status breakdown
      Tourist.aggregate([
        {
          $group: {
            _id: '$kyc.status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Nationality breakdown
      Tourist.aggregate([
        {
          $group: {
            _id: '$nationality',
            count: { $sum: 1 }
          }
        }
      ]),

      // Panic/SOS statistics
      Tourist.aggregate([
        {
          $match: {
            'panics.0': { $exists: true }
          }
        },
        {
          $project: {
            panicCount: { $size: '$panics' },
            recentPanics: {
              $filter: {
                input: '$panics',
                cond: { $gte: ['$$this.timestamp', startDate] }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalPanics: { $sum: '$panicCount' },
            recentPanics: { $sum: { $size: '$recentPanics' } },
            touristsWithPanics: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        period,
        dateRange: { startDate, endDate },
        totalStats: totalStats[0] || {
          totalTourists: 0,
          activeTourists: 0,
          verifiedTourists: 0,
          trackingOptIns: 0
        },
        registrationTrend,
        kycStats,
        nationalityBreakdown,
        panicStats: panicStats[0] || {
          totalPanics: 0,
          recentPanics: 0,
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

// AI Risk Scoring endpoint (placeholder for ML integration)
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

    // Create risk assessment data
    const riskData = {
      touristId: tourist.touristIdOnChain,
      riskScore: Math.max(0, Math.min(100, riskScore)), // Clamp between 0-100
      riskLevel: riskScore >= 80 ? 'high' : riskScore >= 50 ? 'medium' : 'low',
      factors: riskFactors || [],
      modelVersion,
      assessmentDate: new Date(),
      assessedBy: 'AI_RISK_ENGINE'
    };

    // In a real implementation, you'd store this in a RiskAssessments collection
    // For now, we'll add it as an onchain transaction
    const encryptedRiskData = encryptData(JSON.stringify(riskData));
    const riskCID = await uploadToIPFS(encryptedRiskData);

    // Add to blockchain transactions
    tourist.onchainTxs.push({
      action: 'score',
      status: 'pending',
      cid: riskCID,
      createdAt: new Date()
    });

    tourist.updatedAt = new Date();
    await tourist.save();

    res.json({
      success: true,
      riskAssessment: riskData,
      message: 'Risk score updated successfully',
      cid: riskCID
    });

  } catch (error: any) {
    console.error('Update risk score error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Generate QR code for verified tourist
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


export const getRestrictedZones = async (req: Request, res: Response) => {
  try {
    const zones = await RestrictedZone.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, zones });
  } catch (error: any) {
    console.error('Get restricted zones error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a restricted zone
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

// Update a restricted zone
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