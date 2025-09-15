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

// Import the blockchain worker - SAME AS registerTourist
import { onchainWorker } from "../worker/onchainWorker";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Updated OTP store (removed validUntil from user input)
const otpStore = new Map<
  string,
  {
    userData: {
      fullName: string;
      email: string;
      password: string;
    };
    touristData: {
      phoneNumber: string;
      dateOfBirth: string;
      emergencyContacts: any;
      trackingOptIn: boolean;
      // REMOVED: validUntil - will be calculated automatically
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

// UPDATED Combined Registration - Remove validUntil from user input
export const registerUserWithTouristAndKYC = async (req: Request, res: Response) => {
  try {
    const {
      // User data
      fullName, email, password,
      
      // Tourist data (REMOVED validUntil)
      phoneNumber, dateOfBirth, emergencyContacts, trackingOptIn = false,
      
      // KYC data
      kycType, // 'indian' or 'international'
      aadhaarNumber, address, // For Indian KYC
      passportNumber, nationality, passportExpiryDate // For International KYC
    } = req.body;

    // UPDATED Validation (removed validUntil)
    if (!fullName || !email || !password || !phoneNumber || !emergencyContacts || !kycType) {
      return res.status(400).json({ 
        error: "Missing required fields: fullName, email, password, phoneNumber, emergencyContacts, kycType" 
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

    // Validation
    if (!/^\+?[\d\s\-\(\)]{10,15}$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    if (kycType === 'indian' && !/^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Invalid Aadhaar number format' });
    }

    // Generate OTP for verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // UPDATED Store data (removed validUntil)
    otpStore.set(email, {
      userData: { fullName, email, password },
      touristData: { phoneNumber, dateOfBirth, emergencyContacts, trackingOptIn },
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
    console.log(`Phone: ${phoneNumber}`);
    console.log(`KYC Type: ${kycType.toUpperCase()}`);
    console.log(`OTP: ${otp}`);
    console.log(`Tourist ID will be valid for 30 days`);
    console.log(`Expires: ${new Date(expiry).toISOString()}`);
    console.log('======================================');

    res.status(200).json({
      success: true,
      message: "Registration initiated! OTP sent to your email. Your Tourist ID will be valid for 30 days from registration.",
      email,
      phoneNumber,
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

// UPDATED Verify OTP with 30-day auto-expiry
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

    // Prepare KYC data - MORE DETAILED than registerTourist
    let kycData;
    if (stored.kycData.kycType === 'indian') {
      kycData = {
        method: "digilocker" as const,
        status: "verified" as const,
        data: {
          fullName: stored.userData.fullName,
          phoneNumber: stored.touristData.phoneNumber,
          dateOfBirth: stored.touristData.dateOfBirth ? new Date(stored.touristData.dateOfBirth) : undefined,
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
          phoneNumber: stored.touristData.phoneNumber,
          dateOfBirth: stored.touristData.dateOfBirth ? new Date(stored.touristData.dateOfBirth) : undefined,
          passportNumber: stored.kycData.passportNumber!,
          nationality: stored.kycData.nationality!,
          passportExpiryDate: stored.kycData.passportExpiryDate ? new Date(stored.kycData.passportExpiryDate) : undefined,
          address: stored.kycData.address
        }
      };
    }

    // 🔧 FIXED: Auto-calculate validUntil timestamp for 30 days from now
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60; // 30 days * 24 hours * 60 minutes * 60 seconds
    const validUntilTimestamp = currentTimestamp + thirtyDaysInSeconds;
    const bufferedTimestamp = validUntilTimestamp + 3600; // Add 1 hour buffer - SAME AS registerTourist

    console.log('🕒 Tourist ID Validity Calculation:');
    console.log('======================================');
    console.log(`Current timestamp: ${currentTimestamp}`);
    console.log(`Current date: ${new Date(currentTimestamp * 1000).toISOString()}`);
    console.log(`Valid for 30 days until: ${validUntilTimestamp}`);
    console.log(`Valid until date: ${new Date(validUntilTimestamp * 1000).toISOString()}`);
    console.log(`Buffered timestamp: ${bufferedTimestamp}`);
    console.log(`Buffered date: ${new Date(bufferedTimestamp * 1000).toISOString()}`);
    console.log('======================================');

    // EXACT SAME LOGIC as registerTourist - Encrypt and upload emergency contacts
    const encryptedContacts = encryptData(JSON.stringify(stored.touristData.emergencyContacts));
    const emergencyCID = await uploadToIPFS(encryptedContacts);

    // EXACT SAME LOGIC as registerTourist - Encrypt initial tourist data for KYC
    const encryptedKyc = encryptData(JSON.stringify(kycData));
    const kycCID = await uploadToIPFS(encryptedKyc);

    // Generate unique Tourist ID
    const touristId = await generateTouristId(stored.kycData.kycType);
    const qrCodeData = await generateQRCode(touristId);

    // EXACT SAME LOGIC as registerTourist - Create tourist record
    const tourist = new Tourist({
      userId: user._id,
      fullName: stored.userData.fullName,
      phoneNumber: stored.touristData.phoneNumber,
      dateOfBirth: stored.touristData.dateOfBirth ? new Date(stored.touristData.dateOfBirth) : undefined,
      nationality: stored.kycData.kycType === 'indian' ? 'indian' : 'international',
      ownerWallet: wallet.address, // Use generated wallet
      kycCID,
      kyc: kycData,
      emergencyCID,
      validUntil: new Date(bufferedTimestamp * 1000), // 30 days + 1 hour buffer
      trackingOptIn: stored.touristData.trackingOptIn,
      isActive: true, // Active immediately since KYC is already verified
      touristId,
      qrCodeData,
      // EXACT SAME as registerTourist
      onchainTxs: [{
        action: 'register',
        status: 'pending',
        cid: kycCID,
        createdAt: new Date()
      }]
    });
    
    // EXACT SAME LOGIC as registerTourist - Generate onchain tourist ID
    tourist.touristIdOnChain = ethers.keccak256(
      ethers.toUtf8Bytes(String(tourist._id))
    );

    await tourist.save();

    // 🚀 EXACT SAME BLOCKCHAIN PROCESSING as registerTourist
    console.log(`📝 Tourist registered with ID: ${tourist._id} for user: ${user._id}`);
    console.log('🔗 Blockchain worker will process the pending transaction...');

    // Generate JWT for immediate login
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });

    // Clean up OTP data
    otpStore.delete(email);

    console.log('✅ Combined Registration Completed:');
    console.log('======================================');
    console.log(`User: ${user.email}`);
    console.log(`Generated Wallet: ${wallet.address}`);
    console.log(`Tourist ID: ${touristId}`);
    console.log(`Tourist DB ID: ${tourist._id}`);
    console.log(`Tourist Onchain ID: ${tourist.touristIdOnChain}`);
    console.log(`KYC Type: ${stored.kycData.kycType.toUpperCase()}`);
    console.log(`Status: ACTIVE & VERIFIED`);
    console.log(`Valid for 30 days until: ${new Date(validUntilTimestamp * 1000).toISOString()}`);
    console.log(`Buffered until: ${new Date(bufferedTimestamp * 1000).toISOString()}`);
    console.log(`Onchain Status: pending`);
    console.log('======================================');

    // UPDATED RESPONSE with 30-day validity info
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
      qrCode: qrCodeData,
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

async function generateQRCode(touristId: string): Promise<string> {
  const qrData = {
    touristId,
    timestamp: Date.now(),
    version: '1.0'
  };
  
  return Buffer.from(JSON.stringify(qrData)).toString('base64');
}