import mongoose from 'mongoose';

export interface IContestParticipation {
    contestId: mongoose.Types.ObjectId;
    rank: number;
    score: number;
    contestProblems: {
        problemId: mongoose.Types.ObjectId;
        score: number;
        submissionTime: Date;
        submissionStatus: {
            type: String;
            enum: ["correct", "wrong", "partially correct"];
            default: "wrong";
        };
    }[];
}

export interface IContestModeration {
    contestId: mongoose.Types.ObjectId;
}

export interface IContestCreation {
    contestId: mongoose.Types.ObjectId;
}

export interface IFollowers {
    userId: mongoose.Types.ObjectId;
    followedAt: Date;
}

export interface ISolvedProblem {
    problemId: mongoose.Types.ObjectId;
    solvedAt: Date;
}

export interface IProfile {
    name?: string;
    institution?: string;
    country?: string;
    avatarUrl?: string;
    bio?: string;
}

export interface IUserMethods {
    isPasswordCorrect(password: string): Promise<boolean>;
    generateAccessToken(): string;
    generateRefreshToken(): string;
}

// Simple IUser interface for tourist system
export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  profileCompleted?: boolean;
  walletAddress?: string;
  encryptedPrivateKey?: string;
  walletGenerated?: boolean;
  kycStatus?: "pending" | "verified" | "failed";
  kycType?: "indian" | "international";
  isAdmin?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
