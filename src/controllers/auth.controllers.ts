import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { OAuth2Client } from "google-auth-library";
import { ethers } from "ethers";
import { encryptData } from "../utils/crypto";
import { sendOtpEmail } from "../utils/sendMail";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// OTP store for registration
const otpStore = new Map<
  string,
  {
    user: {
      name: string;
      email: string;
      password: string;
    };
    otp: string;
    expiry: number;
    otpVerified?: boolean;
  }
>();

export const registerController = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        error: "All fields (name, email, and password) are required." 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        error: "A user with this email already exists." 
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store user data and OTP temporarily
    otpStore.set(email, {
      user: { name, email, password },
      otp,
      expiry,
    });

    try {
      await sendOtpEmail(email, otp);
    } catch (error) {
      otpStore.delete(email);
      console.error("Error sending OTP email:", error);
      return res.status(500).json({
        error: "Failed to send OTP email. Please try again later."
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully. Please check your email."
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

export const verifyRegistrationOTP = async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ error: "Both email and OTP are required." });
    }

    const stored = otpStore.get(email);

    if (!stored) {
      return res.status(400).json({
        error: "No OTP found for this email. Please request a new OTP."
      });
    }

    if (Date.now() > stored.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ 
        error: "The OTP has expired. Please request a new OTP." 
      });
    }

    if (stored.otp !== otp) {
      return res.status(401).json({ error: "Invalid OTP. Please try again." });
    }

    const { name, password } = stored.user;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate custodial wallet
    const wallet = ethers.Wallet.createRandom();
    const encryptedPrivateKey = encryptData(wallet.privateKey);

    const newUser = new User({ 
      name, 
      email, 
      password: hashedPassword,
      walletAddress: wallet.address,
      encryptedPrivateKey,
      walletGenerated: true,
      kycStatus: "pending"
    });
    
    await newUser.save();
    otpStore.delete(email);

    // Generate JWT for registration
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });

    res.status(201).json({ 
      success: true,
      message: "User registered successfully.", 
      token,
      userId: newUser._id,
      walletAddress: wallet.address,
      kycStatus: "pending"
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    res.status(500).json({
      error: "An error occurred while registering the user. Please try again."
    });
  }
};

export const loginController = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });
    
    // Generate JWT token after successful login
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
      // Generate wallet for new Google user
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
    
    // Generate JWT token for Google login
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