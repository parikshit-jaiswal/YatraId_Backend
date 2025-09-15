import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import Tourist from "../models/Tourist";
import { OAuth2Client } from "google-auth-library";
import { ethers } from "ethers";
import { encryptData } from "../utils/crypto";
import { uploadToIPFS } from "../utils/ipfs";
import { sendOtpEmail } from "../utils/sendMail";
import QRCode from "qrcode";
import { v2 as cloudinary } from "cloudinary";

// FIXED: Import the blockchain worker correctly
import { onchainWorker } from "../worker/onchainWorker";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// UPDATED OTP store (removed phoneNumber and dateOfBirth from user input)
const otpStore = new Map<
  string,
  {
    userData: {
      fullName: string;
      email: string;
      password: string;
    };
    touristData: {
      emergencyContacts: any;
      trackingOptIn: boolean;
      // REMOVED: phoneNumber, dateOfBirth - will be extracted from KYC data
    };
    kycData: {
      kycType: 'indian' | 'international';
      aadhaarNumber?: string;
      address?: string;
      passportNumber?: string;
      nationality?: string;
      passportExpiryDate?: string;
    };
    otp: string;
    expiry: number;
  }
>();

// UPDATED Combined Registration - Remove phoneNumber and dateOfBirth from user input
export const registerUserWithTouristAndKYC = async (req: Request, res: Response) => {
  try {
    const {
      // User data
      fullName, email, password,
      
      // Tourist data (REMOVED phoneNumber, dateOfBirth)
      emergencyContacts, trackingOptIn = false,
      
      // KYC data
      kycType, // 'indian' or 'international'
      aadhaarNumber, address, // For Indian KYC
      passportNumber, nationality, passportExpiryDate // For International KYC
    } = req.body;

    // UPDATED Validation (removed phoneNumber, dateOfBirth)
    if (!fullName || !email || !password || !emergencyContacts || !kycType) {
      return res.status(400).json({ 
        error: "Missing required fields: fullName, email, password, emergencyContacts, kycType" 
      });
    }

    // KYC type specific validation
    if (kycType === 'indian' && (!aadhaarNumber || !address)) {
      return res.status(400).json({ 
        error: 'For Indian KYC: aadhaarNumber and address are required' 
      });
    }

    if (kycType === 'international' && (!passportNumber || !nationality || !passportExpiryDate)) {
      return res.status(400).json({ 
        error: 'For International KYC: passportNumber, nationality, and passportExpiryDate are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        error: "A user with this email already exists." 
      });
    }

    // REMOVED phone number validation since it's not in the request

    if (kycType === 'indian' && !/^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Invalid Aadhaar number format' });
    }

    // Generate OTP for verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // UPDATED Store data (removed phoneNumber, dateOfBirth)
    otpStore.set(email, {
      userData: { fullName, email, password },
      touristData: { emergencyContacts, trackingOptIn },
      kycData: { kycType, aadhaarNumber, address, passportNumber, nationality, passportExpiryDate },
      otp,
      expiry
    });

    // Send OTP email
    try {
      await sendOtpEmail(email, otp);
    } catch (error) {
      otpStore.delete(email);
      console.error("Error sending OTP email:", error);
      return res.status(500).json({
        error: "Failed to send OTP email. Please try again later."
      });
    }

    console.log('📱 Combined Registration OTP Generated:');
    console.log('======================================');
    console.log(`Name: ${fullName}`);
    console.log(`Email: ${email}`);
    console.log(`KYC Type: ${kycType.toUpperCase()}`);
    console.log(`OTP: ${otp}`);
    console.log(`Tourist ID will be valid for 30 days`);
    console.log(`Expires: ${new Date(expiry).toISOString()}`);
    console.log('======================================');

    res.status(200).json({
      success: true,
      message: "Registration initiated! OTP sent to your email. Your Tourist ID will be valid for 30 days from registration.",
      email,
      kycType,
      validityPeriod: "30 days",
      expiresIn: 600,
      nextStep: "Verify OTP using /api/auth/verify-combined-registration endpoint"
    });

  } catch (error: any) {
    console.error('Combined registration error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

// UPDATED Verify OTP with FIXED onchain worker integration
export const verifyCombinedRegistration = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const stored = otpStore.get(email);
    if (!stored) {
      return res.status(400).json({
        error: "No registration found for this email. Please start registration again."
      });
    }

    if (Date.now() > stored.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ 
        error: "OTP expired. Please start registration again." 
      });
    }

    if (stored.otp !== otp) {
      return res.status(401).json({ error: "Invalid OTP. Please try again." });
    }

    // Create user account (generate wallet here)
    const hashedPassword = await bcrypt.hash(stored.userData.password, 10);
    const wallet = ethers.Wallet.createRandom();
    const encryptedPrivateKey = encryptData(wallet.privateKey);

    const user = new User({
      name: stored.userData.fullName,
      email: stored.userData.email, 
      password: hashedPassword,
      walletAddress: wallet.address,
      encryptedPrivateKey,
      walletGenerated: true,
      kycStatus: "verified",
      kycType: stored.kycData.kycType
    });
    await user.save();

    // UPDATED: Extract phoneNumber and dateOfBirth from emergency contacts
    // Since phone/DOB are removed from request, we'll use placeholder values
    const placeholderPhone = stored.touristData.emergencyContacts[0]?.phoneNumber || stored.userData.email;
    const placeholderDOB = "1990-01-01"; // Default DOB

    // Prepare KYC data - MORE DETAILED than registerTourist
    let kycData;
    if (stored.kycData.kycType === 'indian') {
      kycData = {
        method: "digilocker" as const,
        status: "verified" as const,
        data: {
          fullName: stored.userData.fullName,
          phoneNumber: placeholderPhone, // From emergency contact or email
          dateOfBirth: new Date(placeholderDOB),
          aadhaarNumber: stored.kycData.aadhaarNumber!,
          address: stored.kycData.address!
        }
      };
    } else {
      kycData = {
        method: "passport" as const,
        status: "verified" as const,
        data: {
          fullName: stored.userData.fullName,
          phoneNumber: placeholderPhone, // From emergency contact or email
          dateOfBirth: new Date(placeholderDOB),
          passportNumber: stored.kycData.passportNumber!,
          nationality: stored.kycData.nationality!,
          passportExpiryDate: stored.kycData.passportExpiryDate ? new Date(stored.kycData.passportExpiryDate) : undefined,
          address: stored.kycData.address
        }
      };
    }

    // Auto-calculate validUntil timestamp for 30 days from now
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    const validUntilTimestamp = currentTimestamp + thirtyDaysInSeconds;
    const bufferedTimestamp = validUntilTimestamp + 3600;

    console.log('🕒 Tourist ID Validity Calculation:');
    console.log('======================================');
    console.log(`Current timestamp: ${currentTimestamp}`);
    console.log(`Current date: ${new Date(currentTimestamp * 1000).toISOString()}`);
    console.log(`Valid for 30 days until: ${validUntilTimestamp}`);
    console.log(`Valid until date: ${new Date(validUntilTimestamp * 1000).toISOString()}`);
    console.log(`Buffered timestamp: ${bufferedTimestamp}`);
    console.log(`Buffered date: ${new Date(bufferedTimestamp * 1000).toISOString()}`);
    console.log('======================================');

    // Encrypt and upload emergency contacts and KYC data
    const encryptedContacts = encryptData(JSON.stringify(stored.touristData.emergencyContacts));
    const emergencyCID = await uploadToIPFS(encryptedContacts);

    const encryptedKyc = encryptData(JSON.stringify(kycData));
    const kycCID = await uploadToIPFS(encryptedKyc);

    // Generate unique Tourist ID
    const touristId = await generateTouristId(stored.kycData.kycType);
    
    // Enhanced QR Code Generation with Cloudinary Upload
    const qrCodeData = await generateAndUploadQRCode(touristId, stored.userData.fullName);

    // Create tourist record
    const tourist = new Tourist({
      userId: user._id,
      fullName: stored.userData.fullName,
      phoneNumber: placeholderPhone, // Use placeholder
      dateOfBirth: new Date(placeholderDOB), // Use placeholder
      nationality: stored.kycData.kycType === 'indian' ? 'indian' : 'international',
      ownerWallet: wallet.address,
      kycCID,
      kyc: kycData,
      emergencyCID,
      validUntil: new Date(bufferedTimestamp * 1000),
      trackingOptIn: stored.touristData.trackingOptIn,
      isActive: true,
      touristId,
      qrCodeData,
      onchainTxs: [{
        action: 'register',
        status: 'pending',
        cid: kycCID,
        createdAt: new Date()
      }]
    });
    
    tourist.touristIdOnChain = ethers.keccak256(
      ethers.toUtf8Bytes(String(tourist._id))
    );

    await tourist.save();

    // 🚀 FIXED: Trigger onchain worker - This was missing!
    console.log(`📝 Tourist registered with ID: ${tourist._id} for user: ${user._id}`);
    console.log('🔗 Starting onchain worker to process pending transactions...');

    // FIXED: Start the onchain worker if not already started
    try {
      // The onchainWorker should automatically pick up pending transactions
      // But we need to make sure it's running
      if (!onchainWorker.isRunning) {
        onchainWorker.start();
        console.log('✅ Onchain worker started successfully');
      } else {
        console.log('✅ Onchain worker is already running');
      }
    } catch (workerError) {
      console.error('⚠️ Onchain worker error (continuing anyway):', workerError);
    }

    // Generate JWT for immediate login
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });

    // Clean up OTP data
    otpStore.delete(email);

    console.log('✅ Combined Registration Completed:');
    console.log('======================================');
    console.log(`User: ${user.email}`);
    console.log(`Generated Wallet: ${wallet.address}`);
    console.log(`Tourist ID: ${touristId}`);
    console.log(`QR Code URL: ${qrCodeData.cloudinaryUrl}`);
    console.log(`Tourist DB ID: ${tourist._id}`);
    console.log(`Tourist Onchain ID: ${tourist.touristIdOnChain}`);
    console.log(`KYC Type: ${stored.kycData.kycType.toUpperCase()}`);
    console.log(`Status: ACTIVE & VERIFIED`);
    console.log(`Valid for 30 days until: ${new Date(validUntilTimestamp * 1000).toISOString()}`);
    console.log(`Buffered until: ${new Date(bufferedTimestamp * 1000).toISOString()}`);
    console.log(`Onchain Status: pending`);
    console.log('======================================');

    // UPDATED RESPONSE (removed phone number)
    res.status(201).json({
      success: true,
      message: "Registration completed successfully! Your digital Tourist ID is ready and valid for 30 days!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletAddress: wallet.address,
        kycStatus: "verified",
        kycType: stored.kycData.kycType
      },
      tourist: {
        id: tourist._id,
        touristId: touristId,
        touristIdOnChain: tourist.touristIdOnChain,
        nationality: tourist.nationality,
        isActive: true,
        onchainStatus: 'pending',
        kycStatus: 'verified',
        validUntil: validUntilTimestamp,
        validUntilDate: new Date(validUntilTimestamp * 1000).toISOString(),
        validityPeriod: "30 days",
        daysRemaining: 30
      },
      qrCode: {
        touristId: touristId,
        imageUrl: qrCodeData.cloudinaryUrl,
        publicId: qrCodeData.publicId,
        scanData: qrCodeData.scanData,
        message: `Scan this QR code to view Tourist ID: ${touristId}`
      },
      validity: {
        issuedAt: currentTimestamp,
        issuedDate: new Date(currentTimestamp * 1000).toISOString(),
        validUntil: validUntilTimestamp,
        validUntilDate: new Date(validUntilTimestamp * 1000).toISOString(),
        validityPeriod: "30 days",
        daysRemaining: 30,
        status: "active"
      },
      blockchain: {
        status: "pending",
        message: "Tourist profile created successfully. Blockchain registration will be processed automatically.",
        kycCID: kycCID,
        emergencyCID: emergencyCID
      }
    });

  } catch (error: any) {
    console.error('Verify combined registration error:', error);
    res.status(500).json({
      error: "Registration verification failed",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Keep existing controllers unchanged...
export const loginController = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
    
    res.status(200).json({ 
      success: true,
      token,
      userId: user._id,
      walletAddress: user.walletAddress,
      kycStatus: user.kycStatus,
      kycType: user.kycType
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const googleLoginController = async (req: Request, res: Response) => {
  const { tokenId } = req.body;
  
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ message: "Invalid Google token" });
    
    const { email, name } = payload;
    let user = await User.findOne({ email });
    
    if (!user) {
      const wallet = ethers.Wallet.createRandom();
      const encryptedPrivateKey = encryptData(wallet.privateKey);

      user = new User({ 
        name, 
        email, 
        password: "google-auth", 
        profileCompleted: true,
        walletAddress: wallet.address,
        encryptedPrivateKey,
        walletGenerated: true,
        kycStatus: "pending"
      });
      await user.save();
    }
    
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
    
    res.status(200).json({ 
      success: true,
      token,
      userId: user._id,
      walletAddress: user.walletAddress,
      kycStatus: user.kycStatus
    });
  } catch (error: any) {
    console.error("Google login error:", error);
    res.status(500).json({ error: "Google login failed", details: error.message });
  }
};

// Helper functions remain the same...
async function generateTouristId(kycType: 'indian' | 'international'): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = kycType === 'indian' ? 'TID-IND' : 'TID-INTL';
  
  const lastTourist = await Tourist.findOne({
    touristId: { $regex: `^${prefix}-${year}-` }
  }).sort({ touristId: -1 });

  let sequence = 1;
  if (lastTourist?.touristId) {
    const lastSequence = parseInt(lastTourist.touristId.split('-').pop() || '0');
    sequence = lastSequence + 1;
  }

  return `${prefix}-${year}-${sequence.toString().padStart(6, '0')}`;
}

// Enhanced QR Code Generation with Simple Text Format (unchanged)
async function generateAndUploadQRCode(touristId: string, fullName: string): Promise<{
  cloudinaryUrl: string;
  publicId: string;
  scanData: string;
}> {
  try {
    console.log('🔄 Generating QR Code for Tourist ID:', touristId);

    const qrDataString = `${touristId}
${fullName}
Digital tourist id generated by Yatraid`;

    console.log('📄 QR Code will contain:');
    console.log('======================================');
    console.log(qrDataString);
    console.log('======================================');

    const qrCodeOptions = {
      type: 'image/png' as const,
      quality: 0.92,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 512
    };

    const qrCodeDataURL = await QRCode.toDataURL(qrDataString, qrCodeOptions);
    
    console.log('✅ QR Code generated successfully');

    console.log('🔄 Uploading QR Code to Cloudinary...');

    const cloudinaryResult = await cloudinary.uploader.upload(qrCodeDataURL, {
      folder: 'yatraid/qrcodes',
      public_id: `qr_${touristId.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
      overwrite: true,
      resource_type: 'image',
      format: 'png',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      tags: ['tourist_qr', 'yatraid', touristId]
    });

    console.log('✅ QR Code uploaded to Cloudinary successfully');
    console.log(`📸 Cloudinary URL: ${cloudinaryResult.secure_url}`);

    return {
      cloudinaryUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      scanData: qrDataString
    };

  } catch (error) {
    console.error('❌ QR Code generation/upload error:', error);
    
    const fallbackData = `${touristId}
${fullName}
Digital tourist id generated by Yatraid`;

    return {
      cloudinaryUrl: `data:text/plain;base64,${Buffer.from(fallbackData).toString('base64')}`,
      publicId: `fallback_${touristId}`,
      scanData: fallbackData
    };
  }
}