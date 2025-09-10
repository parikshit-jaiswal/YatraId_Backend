import { IUser } from './user.types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: any;
        name: string;
        email: string;
        profileCompleted?: boolean;
        walletAddress?: string;
        walletGenerated?: boolean;
        kycStatus?: "pending" | "verified" | "failed";
        kycType?: "indian" | "international";
        isAdmin?: boolean;
        createdAt: Date;
        updatedAt: Date;
      };
    }
  }
}

export {};