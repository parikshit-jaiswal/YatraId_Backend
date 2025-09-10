import { Request, Response } from "express";
import { User } from "../models/User";
import Tourist from "../models/Tourist";
import { uploadToIPFS } from "../utils/ipfs";
import { encryptData } from "../utils/crypto";

// In-memory OTP storage (use Redis in production)
interface OTPData {
  otp: string;
  kycData: any;
  expiresAt: Date;
  verified: boolean;
}

const otpStorage = new Map<string, OTPData>();

// Step 1: Initiate Indian KYC with user details
export const initiateIndianKyc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id; // Changed from req.user?.id
    const { 
      fullName, 
      phoneNumber, 
      dateOfBirth, 
      aadhaarNumber,
      address 
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Validation
    if (!fullName || !phoneNumber || !dateOfBirth || !aadhaarNumber || !address) {
      return res.status(400).json({ 
        error: "Missing required fields: fullName, phoneNumber, dateOfBirth, aadhaarNumber, address" 
      });
    }

    // Validate Aadhaar format (12 digits)
    if (!/^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ''))) {
      return res.status(400).json({ 
        error: "Invalid Aadhaar number format. Must be 12 digits." 
      });
    }

    // Validate phone format
    if (!/^[6-9]\d{9}$/.test(phoneNumber.replace(/[^\d]/g, ''))) {
      return res.status(400).json({ 
        error: "Invalid phone number format. Must be 10 digits starting with 6-9." 
      });
    }

    // Check if tourist profile exists
    const tourist = await Tourist.findOne({ userId });
    if (!tourist) {
      return res.status(400).json({ 
        error: "No tourist profile found. Please register as a tourist first." 
      });
    }

    // Check if KYC is already verified
    if (tourist.kyc.status === 'verified') {
      return res.status(400).json({ 
        error: "KYC already verified",
        touristId: tourist.touristId
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP and KYC data
    const otpKey = `${userId}_indian_kyc`;
    otpStorage.set(otpKey, {
      otp,
      kycData: {
        fullName,
        phoneNumber,
        dateOfBirth,
        aadhaarNumber,
        address,
        method: "digilocker"
      },
      expiresAt,
      verified: false
    });

    // Print OTP to terminal (since we can't send SMS)
    console.log('📱 KYC OTP Generated:');
    console.log('======================================');
    console.log(`User: ${req.user?.email}`);
    console.log(`Phone: ${phoneNumber}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log('======================================');

    res.json({
      success: true,
      message: `OTP sent to ${phoneNumber}. Please check your terminal for OTP (demo mode).`,
      phoneNumber: phoneNumber,
      expiresIn: 600, // 10 minutes
      nextStep: "Enter OTP using /api/kyc/verify-otp endpoint"
    });

  } catch (error: any) {
    console.error("Initiate Indian KYC error:", error);
    res.status(500).json({ 
      error: "KYC initiation failed",
      details: error.message
    });
  }
};

// Step 2: Verify OTP and complete Indian KYC
export const verifyOtpAndCompleteKyc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id; // Changed from req.user?.id
    const { otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ error: "User ID and OTP are required" });
    }

    const otpKey = `${userId}_indian_kyc`;
    const otpData = otpStorage.get(otpKey);

    if (!otpData) {
      return res.status(400).json({ 
        error: "No OTP found. Please initiate KYC first." 
      });
    }

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt) {
      otpStorage.delete(otpKey);
      return res.status(400).json({ 
        error: "OTP expired. Please request a new one." 
      });
    }

    // Verify OTP
    if (otpData.otp !== otp.toString()) {
      return res.status(400).json({ 
        error: "Invalid OTP. Please try again." 
      });
    }

    // Mark OTP as verified
    otpData.verified = true;

    // Get tourist profile
    const tourist = await Tourist.findOne({ userId });
    if (!tourist) {
      return res.status(400).json({ 
        error: "Tourist profile not found" 
      });
    }

    // Generate unique Tourist ID after successful verification
    const touristId = await generateTouristId('indian');
    const qrCodeData = await generateQRCode(touristId, (tourist._id as string).toString());

    // Update user KYC status
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.kycStatus = "verified";
    user.kycType = "indian";
    await user.save();

    // Prepare complete KYC data with verified details
    const kycData = {
      method: "digilocker" as "digilocker" | "passport" | "pending",
      status: "verified" as "pending" | "verified" | "failed",
      data: {
        fullName: otpData.kycData.fullName,
        phoneNumber: otpData.kycData.phoneNumber,
        dateOfBirth: new Date(otpData.kycData.dateOfBirth),
        aadhaarNumber: otpData.kycData.aadhaarNumber,
        address: otpData.kycData.address
      }
    };

    // Encrypt and upload verified KYC to IPFS
    const encryptedKyc = encryptData(JSON.stringify(kycData));
    const kycCID = await uploadToIPFS(encryptedKyc);

    // Update tourist profile with verified data
    tourist.kyc = kycData;
    tourist.kycCID = kycCID;
    tourist.nationality = "indian";
    tourist.touristId = touristId; // Set unique Tourist ID
    tourist.qrCodeData = qrCodeData;
    tourist.isActive = true; // Activate tourist services
    tourist.fullName = otpData.kycData.fullName; // Update name if different

    // Add verification transaction
    tourist.onchainTxs.push({
      action: 'verify_kyc',
      status: 'pending',
      cid: kycCID,
      createdAt: new Date()
    });

    tourist.updatedAt = new Date();
    await tourist.save();

    // Clean up OTP data
    otpStorage.delete(otpKey);

    console.log('✅ KYC Verified Successfully:');
    console.log('======================================');
    console.log(`Tourist ID: ${touristId}`);
    console.log(`User: ${user.email}`);
    console.log(`Phone: ${kycData.data.phoneNumber}`);
    console.log(`Status: VERIFIED`);
    console.log('======================================');

    res.json({
      success: true,
      message: "Indian KYC verified successfully! Your digital Tourist ID is ready!",
      touristId: touristId, // Human-readable Tourist ID
      qrCode: qrCodeData,
      kycData: {
        method: "digilocker",
        status: "verified",
        name: kycData.data.fullName,
        aadhaarNumber: kycData.data.aadhaarNumber.replace(/\d(?=\d{4})/g, 'X'), // Mask Aadhaar
        phoneNumber: kycData.data.phoneNumber
      },
      tourist: {
        id: tourist._id,
        touristId: touristId,
        touristIdOnChain: tourist.touristIdOnChain,
        nationality: tourist.nationality,
        kycStatus: "verified",
        isActive: true,
        onchainStatus: "pending"
      }
    });

  } catch (error: any) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ 
      error: "OTP verification failed",
      details: error.message
    });
  }
};

// Step 3: International KYC with passport details
export const initiateInternationalKyc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id; // Changed from req.user?.id
    const { 
      fullName, 
      phoneNumber, 
      dateOfBirth, 
      passportNumber,
      nationality,
      passportExpiryDate,
      address 
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Validation
    if (!fullName || !phoneNumber || !dateOfBirth || !passportNumber || !nationality || !passportExpiryDate) {
      return res.status(400).json({ 
        error: "Missing required fields: fullName, phoneNumber, dateOfBirth, passportNumber, nationality, passportExpiryDate" 
      });
    }

    // Check if tourist profile exists
    const tourist = await Tourist.findOne({ userId });
    if (!tourist) {
      return res.status(400).json({ 
        error: "No tourist profile found. Please register as a tourist first." 
      });
    }

    // Check if KYC is already verified
    if (tourist.kyc.status === 'verified') {
      return res.status(400).json({ 
        error: "KYC already verified",
        touristId: tourist.touristId
      });
    }

    // Generate OTP for international KYC
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP and KYC data
    const otpKey = `${userId}_international_kyc`;
    otpStorage.set(otpKey, {
      otp,
      kycData: {
        fullName,
        phoneNumber,
        dateOfBirth,
        passportNumber,
        nationality,
        passportExpiryDate,
        address,
        method: "passport"
      },
      expiresAt,
      verified: false
    });

    // Print OTP to terminal
    console.log('📱 International KYC OTP Generated:');
    console.log('======================================');
    console.log(`User: ${req.user?.email}`);
    console.log(`Phone: ${phoneNumber}`);
    console.log(`Passport: ${passportNumber}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log('======================================');

    res.json({
      success: true,
      message: `OTP sent to ${phoneNumber}. Please check your terminal for OTP (demo mode).`,
      phoneNumber: phoneNumber,
      expiresIn: 600, // 10 minutes
      nextStep: "Enter OTP using /api/kyc/verify-international-otp endpoint"
    });

  } catch (error: any) {
    console.error("Initiate International KYC error:", error);
    res.status(500).json({ 
      error: "KYC initiation failed",
      details: error.message
    });
  }
};

// Step 4: Verify International KYC OTP
export const verifyInternationalOtp = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id; // Changed from req.user?.id
    const { otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ error: "User ID and OTP are required" });
    }

    const otpKey = `${userId}_international_kyc`;
    const otpData = otpStorage.get(otpKey);

    if (!otpData) {
      return res.status(400).json({ 
        error: "No OTP found. Please initiate international KYC first." 
      });
    }

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt) {
      otpStorage.delete(otpKey);
      return res.status(400).json({ 
        error: "OTP expired. Please request a new one." 
      });
    }

    // Verify OTP
    if (otpData.otp !== otp.toString()) {
      return res.status(400).json({ 
        error: "Invalid OTP. Please try again." 
      });
    }

    // Get tourist profile
    const tourist = await Tourist.findOne({ userId });
    if (!tourist) {
      return res.status(400).json({ 
        error: "Tourist profile not found" 
      });
    }

    // Generate unique Tourist ID after successful verification
    const touristId = await generateTouristId('international');
    const qrCodeData = await generateQRCode(touristId, (tourist._id as string).toString());

    // Update user KYC status
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.kycStatus = "verified";
    user.kycType = "international";
    await user.save();

    // Prepare complete KYC data
    const kycData = {
      method: "passport" as "digilocker" | "passport" | "pending",
      status: "verified" as "pending" | "verified" | "failed",
      data: {
        fullName: otpData.kycData.fullName,
        phoneNumber: otpData.kycData.phoneNumber,
        dateOfBirth: new Date(otpData.kycData.dateOfBirth),
        passportNumber: otpData.kycData.passportNumber,
        nationality: otpData.kycData.nationality,
        passportExpiryDate: new Date(otpData.kycData.passportExpiryDate),
        address: otpData.kycData.address
      }
    };

    // Encrypt and upload to IPFS
    const encryptedKyc = encryptData(JSON.stringify(kycData));
    const kycCID = await uploadToIPFS(encryptedKyc);

    // Update tourist profile
    tourist.kyc = kycData;
    tourist.kycCID = kycCID;
    tourist.nationality = "international";
    tourist.touristId = touristId; // Set unique Tourist ID
    tourist.qrCodeData = qrCodeData;
    tourist.isActive = true; // Activate tourist services
    tourist.fullName = otpData.kycData.fullName;

    // Add verification transaction
    tourist.onchainTxs.push({
      action: 'verify_kyc',
      status: 'pending',
      cid: kycCID,
      createdAt: new Date()
    });

    tourist.updatedAt = new Date();
    await tourist.save();

    // Clean up OTP data
    otpStorage.delete(otpKey);

    console.log('✅ International KYC Verified Successfully:');
    console.log('======================================');
    console.log(`Tourist ID: ${touristId}`);
    console.log(`User: ${user.email}`);
    console.log(`Passport: ${kycData.data.passportNumber}`);
    console.log(`Status: VERIFIED`);
    console.log('======================================');

    res.json({
      success: true,
      message: "International KYC verified successfully! Your digital Tourist ID is ready!",
      touristId: touristId, // Human-readable Tourist ID
      qrCode: qrCodeData,
      kycData: {
        method: "passport",
        status: "verified",
        name: kycData.data.fullName,
        passportNumber: kycData.data.passportNumber,
        nationality: kycData.data.nationality,
        phoneNumber: kycData.data.phoneNumber
      },
      tourist: {
        id: tourist._id,
        touristId: touristId,
        touristIdOnChain: tourist.touristIdOnChain,
        nationality: tourist.nationality,
        kycStatus: "verified",
        isActive: true,
        onchainStatus: "pending"
      }
    });

  } catch (error: any) {
    console.error("Verify International OTP error:", error);
    res.status(500).json({ 
      error: "OTP verification failed",
      details: error.message
    });
  }
};

// Get KYC Status
export const getKycStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id; // Changed from req.user?.id
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const user = await User.findById(userId).select('kycStatus kycType walletAddress');
    const tourist = await Tourist.findOne({ userId }).select('kyc kycCID nationality touristId touristIdOnChain onchainTxs isActive');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Analyze blockchain status
    let blockchainStatus = 'not_started';
    let latestTx = null;
    let isRegistered = false;
    let canUseBlockchain = false;
    
    if (tourist && tourist.onchainTxs && tourist.onchainTxs.length > 0) {
      const registerTx = tourist.onchainTxs.find(tx => tx.action === 'register' && tx.status === 'confirmed');
      isRegistered = !!registerTx;
      latestTx = tourist.onchainTxs[tourist.onchainTxs.length - 1];
      canUseBlockchain = isRegistered;
      
      if (isRegistered) {
        const pendingTxs = tourist.onchainTxs.filter(tx => 
          tx.status === 'pending' || tx.status === 'submitted'
        );
        blockchainStatus = pendingTxs.length > 0 ? 'updating' : 'active';
      } else {
        blockchainStatus = 'registering';
      }
    }

    res.json({
      success: true,
      kycStatus: user.kycStatus,
      kycType: user.kycType,
      walletAddress: user.walletAddress,
      hasProfile: !!tourist,
      nationality: tourist?.nationality,
      touristId: tourist?._id,
      mongoObjectId: tourist?._id ? tourist._id.toString() : undefined,
      touristIdOnChain: tourist?.touristIdOnChain,
      humanReadableTouristId: tourist?.touristId, // This is the generated ID like TID-IND-2024-000001
      blockchainStatus,
      isRegisteredOnChain: isRegistered,
      canUseBlockchain,
      isActive: tourist?.isActive || false,
      latestTransaction: latestTx ? {
        action: latestTx.action,
        status: latestTx.status,
        txHash: latestTx.txHash,
        createdAt: latestTx.createdAt,
        updatedAt: latestTx.updatedAt,
        error: latestTx.error
      } : null,
      kycData: tourist?.kyc ? {
        method: tourist.kyc.method,
        status: tourist.kyc.status,
      } : null
    });

  } catch (error: any) {
    console.error("Get KYC status error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Retry failed KYC
export const retryKyc = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id; // Changed from req.user?.id
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Clear any existing OTP data
    otpStorage.delete(`${userId}_indian_kyc`);
    otpStorage.delete(`${userId}_international_kyc`);

    // Reset KYC status
    await User.findByIdAndUpdate(userId, { 
      kycStatus: "pending",
      kycType: undefined 
    });
    
    // Reset tourist KYC if exists
    await Tourist.findOneAndUpdate({ userId }, { 
      "kyc.status": "pending",
      isActive: false,
      touristId: undefined,
      qrCodeData: undefined
    });

    res.json({
      success: true,
      message: "KYC reset successfully. You can now retry verification."
    });

  } catch (error: any) {
    console.error("Retry KYC error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Helper function to generate unique Tourist ID
async function generateTouristId(nationality: 'indian' | 'international'): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = nationality === 'indian' ? 'TID-IND' : 'TID-INTL';
  
  // Find the last issued ID for this year and nationality
  const lastTourist = await Tourist.findOne({
    touristId: { $regex: `^${prefix}-${year}-` },
    nationality
  }).sort({ touristId: -1 });

  let sequence = 1;
  if (lastTourist?.touristId) {
    const lastSequence = parseInt(lastTourist.touristId.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }

  return `${prefix}-${year}-${sequence.toString().padStart(6, '0')}`;
}

// Helper function to generate QR code data
async function generateQRCode(touristId: string, mongoId: string): Promise<string> {
  const qrData = {
    touristId,
    mongoId,
    timestamp: Date.now(),
    version: '1.0'
  };
  
  return Buffer.from(JSON.stringify(qrData)).toString('base64');
}

