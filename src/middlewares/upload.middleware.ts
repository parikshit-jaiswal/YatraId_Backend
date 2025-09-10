import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// Define file size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Configure Cloudinary storage for profile pictures
const profilePictureStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'code-up-profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }],
    public_id: (req: Request, file: Express.Multer.File) => {
      const userId = req.user?._id;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      return `user-${userId}-${uniqueSuffix}`;
    },
  } as any,
});

// Configure Cloudinary storage for contest backgrounds
const contestBackgroundStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'code-up-contest-backgrounds',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1920, height: 1080, crop: 'limit' }],
    public_id: (req: Request, file: Express.Multer.File) => {
      const contestId = req.params?.contestId;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      return `contest-${contestId}-${uniqueSuffix}`;
    },
  } as any,
});

// File filter to check file types
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new ApiError(400, 'Only .jpg, .jpeg, .png, .gif, and .webp format allowed'));
  }
};

// Create multer upload instance for profile pictures
export const uploadProfilePicture = multer({
  storage: profilePictureStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// Create multer upload instance for contest backgrounds
export const uploadContestBackground = multer({
  storage: contestBackgroundStorage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: fileFilter
});

// For other types of uploads (for future use)
export const createUploader = (
  folderName: string,
  allowedFormats: string[] = ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  transformations = [{ width: 1000, height: 1000, crop: 'limit' }]
) => {
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: `code-up-${folderName}`,
      allowed_formats: allowedFormats,
      transformation: transformations,
      public_id: (req: Request, file: Express.Multer.File) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        return `${folderName}-${uniqueSuffix}`;
      },
    } as any,
  });

  return multer({
    storage: storage,
    limits: {
      fileSize: MAX_FILE_SIZE
    },
    fileFilter: fileFilter
  });
};