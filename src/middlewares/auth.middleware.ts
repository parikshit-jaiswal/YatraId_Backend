import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/User";

interface DecodedToken {
  id: string;
  iat?: number;
  exp?: number;
}

export const verifyJWT = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodeToken = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    const user = await User.findById(decodeToken.id).select("-password -encryptedPrivateKey");

    if (!user) {
      throw new ApiError(401, "Invalid token");
    }

    req.user = user as any;
    next();
  } catch (error) {
    throw new ApiError(401, (error as Error)?.message || "Invalid token");
  }
});

// Admin middleware
export const adminMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    throw new ApiError(403, "Admin access required");
  }
  next();
});