# YatraId Backend API Documentation

A comprehensive tourist safety and management system built with Node.js, TypeScript, MongoDB, and blockchain integration.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with Google OAuth support
- **Tourist Management**: Complete tourist profile management with KYC verification
- **Family Management**: Bidirectional family relationship tracking
- **Emergency System**: SOS/Panic alerts with blockchain-secured evidence storage
- **Incident Reporting**: Comprehensive incident management with e-FIR generation
- **KYC Verification**: Support for both Indian (Aadhaar) and International (Passport) KYC
- **Blockchain Integration**: Secure data storage using IPFS and Ethereum
- **Admin Dashboard**: Complete administrative controls and analytics

## 🛠️ Tech Stack

- **Backend**: Node.js, TypeScript, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, Google OAuth 2.0
- **Blockchain**: Ethers.js, IPFS
- **Storage**: Cloudinary for images
- **Security**: Crypto encryption for sensitive data

---

## � Table of Contents

1. [**API Configuration**](#-api-configuration)
2. [**Authentication APIs**](#-authentication-apis)
   - [Register with KYC](#1-register-with-kyc)
   - [Verify Registration OTP](#2-verify-registration-otp)
   - [Login](#3-login)
   - [Google Login](#4-google-login)
3. [**KYC APIs**](#-kyc-apis)
   - [Initiate Indian KYC](#1-initiate-indian-kyc)
   - [Verify Indian KYC OTP](#2-verify-indian-kyc-otp)
   - [Initiate International KYC](#3-initiate-international-kyc)
   - [Verify International KYC OTP](#4-verify-international-kyc-otp)
   - [Get KYC Status](#5-get-kyc-status)
   - [Retry KYC](#6-retry-kyc)
4. [**Tourist Management APIs**](#-tourist-management-apis)
   - [Register Tourist](#1-register-tourist)
   - [Get Tourist Dashboard](#2-get-tourist-dashboard)
   - [Get All Tourists](#3-get-all-tourists)
   - [Get Tourist by ID](#4-get-tourist-by-id)
   - [Update Tourist](#5-update-tourist)
   - [Upload Profile Image](#6-upload-profile-image)
   - [Raise Panic Alert](#7-raise-panic-alert)
   - [Update Safety Score](#8-update-safety-score)
5. [**Admin Tourist APIs**](#-admin-tourist-apis)
   - [Search Tourist by ID](#1-search-tourist-by-id)
   - [Get Tourist Analytics](#2-get-tourist-analytics)
   - [Get Heat Map Data](#3-get-heat-map-data)
   - [Get SOS Alerts](#4-get-sos-alerts)
   - [Update Risk Score](#5-update-risk-score)
   - [Generate QR Code](#6-generate-qr-code)
6. [**Family Management APIs**](#-family-management-apis)
   - [Create Family](#1-create-family)
   - [Get Family](#2-get-family)
   - [Update Family Settings](#3-update-family-settings)
   - [Add Family Member](#4-add-family-member)
   - [Remove Family Member](#5-remove-family-member)
   - [Update Family Member](#6-update-family-member)
   - [Get Families as Member](#7-get-families-as-member)
   - [Search Tourist for Family](#8-search-tourist-for-family)
7. [**Location APIs**](#-location-apis)
   - [Update Location](#1-update-location)
   - [Get Family Locations](#2-get-family-locations)
   - [Get Tourist Location](#3-get-tourist-location)
   - [Get Location Updates](#4-get-location-updates)
   - [Toggle Location Sharing](#5-toggle-location-sharing)
   - [Get Location Settings](#6-get-location-settings)
   - [Update Location Settings](#7-update-location-settings)
   - [Emergency Location Broadcast](#8-emergency-location-broadcast)
8. [**Incident Management APIs**](#-incident-management-apis)
   - [Report Incident](#1-report-incident)
   - [Get Incident](#2-get-incident)
   - [Get All Incidents (Admin)](#3-get-all-incidents-admin)
   - [Update Incident Status (Admin)](#4-update-incident-status-admin)
   - [Generate FIR (Admin)](#5-generate-fir-admin)
   - [Get Incident Statistics (Admin)](#6-get-incident-statistics-admin)
9. [**Restricted Zone APIs**](#-restricted-zone-apis)
   - [Create Restricted Zone](#1-create-restricted-zone)
   - [Get Restricted Zones](#2-get-restricted-zones)
   - [Update Restricted Zone](#3-update-restricted-zone)
   - [Delete Restricted Zone](#4-delete-restricted-zone)
10. [**Test API**](#-test-api)
11. [**Error Response Formats**](#-error-response-formats)

---

## 🔧 API Configuration

### Base URL
```
http://localhost:8080/api
```

### Common Headers
```http
Content-Type: application/json
Authorization: Bearer <your_jwt_token>  # For protected routes
```

### Response Format
All APIs follow a consistent response format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...},
  "statusCode": 200
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "errors": [...] // Optional detailed errors
}
```

---

## 🔐 Authentication APIs

All authentication endpoints are under `/api/auth`

### 1. Register with KYC
Register a new user with KYC data in one step. Phone number and date of birth are extracted from KYC data.

**Endpoint:** `POST /auth/register-with-kyc`

**Request Body (Indian KYC):**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "emergencyContacts": [
    {
      "name": "Jane Doe",
      "relationship": "spouse",
      "phoneNumber": "+91-9876543211"
    }
  ],
  "trackingOptIn": true,
  "kycType": "indian",
  "aadhaarNumber": "123456789012",
  "address": "123 Main Street, City, State, 123456"
}
```

**Request Body (International KYC):**
```json
{
  "fullName": "John Smith",
  "email": "john.smith@example.com",
  "password": "securePassword123",
  "emergencyContacts": [
    {
      "name": "Jane Smith",
      "relationship": "spouse",
      "phoneNumber": "+1-555-123-4567"
    }
  ],
  "trackingOptIn": true,
  "kycType": "international",
  "passportNumber": "P123456789",
  "nationality": "american",
  "passportExpiryDate": "2030-12-25"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Registration initiated! OTP sent to your email. Your Tourist ID will be valid for 30 days from registration.",
  "data": {
    "email": "john.doe@example.com",
    "kycType": "indian",
    "validityPeriod": "30 days",
    "expiresIn": 600
  },
  "statusCode": 200,
  "nextStep": "Verify OTP using /api/auth/verify-combined-registration endpoint"
}
```

### 2. Verify Registration OTP
Complete the registration process by verifying the OTP sent to email.

**Endpoint:** `POST /auth/verify-combined-registration`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Registration completed successfully! Welcome to YatraID.",
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "profileCompleted": true,
      "kycStatus": "verified",
      "kycType": "indian",
      "walletAddress": "0x1234...abcd",
      "walletGenerated": true
    },
    "tourist": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j1",
      "touristId": "TID-IND-2024-000001",
      "fullName": "John Doe",
      "phoneNumber": "+91-9876543210",
      "dateOfBirth": "1990-01-15",
      "nationality": "indian",
      "kycStatus": "verified",
      "verificationLevel": "verified",
      "safetyScore": 100,
      "riskLevel": "low",
      "trackingOptIn": true,
      "isActive": true,
      "validTill": "2024-02-15T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "statusCode": 201
}
```

### 3. Login
Authenticate existing user and get access tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "profileCompleted": true,
      "kycStatus": "verified",
      "kycType": "indian",
      "isAdmin": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "statusCode": 200
}
```

### 4. Google Login
Authenticate user using Google OAuth token.

**Endpoint:** `POST /auth/google-login`

**Request Body:**
```json
{
  "tokenId": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE2NzAyNzk5..."
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Google login successful",
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "name": "John Doe",
      "email": "john.doe@gmail.com",
      "profileCompleted": false,
      "kycStatus": "pending",
      "isAdmin": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "requiresProfile": true
  },
}
```

---

## 🆔 KYC APIs

All KYC endpoints are under `/api/kyc` and require authentication.

### 1. Initiate Indian KYC
Start the KYC process for Indian citizens using Aadhaar.

**Endpoint:** `POST /kyc/indian/initiate`
**Authentication:** Required

**Request Body:**
```json
{
  "aadhaarNumber": "123456789012",
  "fullName": "John Doe",
  "dateOfBirth": "1990-01-15",
  "phoneNumber": "+91-9876543210",
  "address": "123 Main Street, New Delhi, Delhi, 110001"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Indian KYC initiated successfully. OTP sent to registered mobile number.",
  "data": {
    "kycId": "kyc_64f5a1b2c3d4e5f6g7h8i9j0",
    "aadhaarNumber": "xxxx-xxxx-9012",
    "otpSentTo": "+91-98765xxxxx",
    "expiresIn": 600
  },
  "statusCode": 200
}
```

### 2. Verify Indian KYC OTP
Complete the Indian KYC process by verifying the OTP.

**Endpoint:** `POST /kyc/indian/verify-otp`
**Authentication:** Required

**Request Body:**
```json
{
  "kycId": "kyc_64f5a1b2c3d4e5f6g7h8i9j0",
  "otp": "123456"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Indian KYC completed successfully! Tourist profile created.",
  "data": {
    "touristId": "TID-IND-2024-000001",
    "kycStatus": "verified",
    "verificationLevel": "verified",
    "validTill": "2025-01-15T00:00:00.000Z",
    "qrCode": "https://res.cloudinary.com/yatraId/image/upload/v1234567890/qr_codes/TID-IND-2024-000001.png",
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
  },
  "statusCode": 200
}
```

### 3. Initiate International KYC
Start the KYC process for international tourists using passport.

**Endpoint:** `POST /kyc/international/initiate`
**Authentication:** Required

**Request Body:**
```json
{
  "passportNumber": "P123456789",
  "fullName": "John Smith",
  "dateOfBirth": "1990-01-15",
  "phoneNumber": "+1-555-123-4567",
  "nationality": "american",
  "passportExpiryDate": "2030-12-25",
  "address": "123 Broadway, New York, NY, 10001, USA"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "International KYC initiated successfully. OTP sent to registered mobile number.",
  "data": {
    "kycId": "kyc_64f5a1b2c3d4e5f6g7h8i9j1",
    "passportNumber": "P123xxxxx89",
    "nationality": "american",
    "otpSentTo": "+1-555-xxx-x567",
    "expiresIn": 600
  },
  "statusCode": 200
}
```

### 4. Verify International KYC OTP
Complete the international KYC process by verifying the OTP.

**Endpoint:** `POST /kyc/international/verify-otp`
**Authentication:** Required

**Request Body:**
```json
{
  "kycId": "kyc_64f5a1b2c3d4e5f6g7h8i9j1",
  "otp": "123456"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "International KYC completed successfully! Tourist profile created.",
  "data": {
    "touristId": "TID-INTL-2024-000001",
    "kycStatus": "verified",
    "verificationLevel": "verified",
    "validTill": "2025-01-15T00:00:00.000Z",
    "qrCode": "https://res.cloudinary.com/yatraId/image/upload/v1234567890/qr_codes/TID-INTL-2024-000001.png",
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
  },
  "statusCode": 200
}
```

### 5. Get KYC Status
Check the current KYC verification status.

**Endpoint:** `GET /kyc/status`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "KYC status retrieved successfully",
  "data": {
    "kycStatus": "verified",
    "kycType": "indian",
    "verificationLevel": "verified",
    "submittedAt": "2024-01-15T10:30:00.000Z",
    "verifiedAt": "2024-01-15T10:35:00.000Z",
    "validTill": "2025-01-15T00:00:00.000Z",
    "touristId": "TID-IND-2024-000001",
    "documents": {
      "aadhaarVerified": true,
      "phoneVerified": true,
      "addressVerified": true
    }
  },
  "statusCode": 200
}
```

### 6. Retry KYC
Retry KYC verification if it failed previously.

**Endpoint:** `POST /kyc/retry`
**Authentication:** Required

**Request Body:**
```json
{
  "kycType": "indian"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "KYC retry initiated. Please proceed with the verification process.",
  "data": {
    "kycType": "indian",
    "status": "pending",
    "retryCount": 1,
    "maxRetries": 3
  },
  "statusCode": 200
}
```

---

## 👤 Tourist Management APIs

All tourist management endpoints are under `/api/tourists` and require authentication.

### 1. Register Tourist
Register a new tourist profile (usually done after KYC completion).

**Endpoint:** `POST /tourists/register`
**Authentication:** Required

**Request Body:**
```json
{
  "fullName": "John Doe",
  "phoneNumber": "+91-9876543210",
  "dateOfBirth": "1990-01-15",
  "nationality": "indian",
  "emergencyContacts": [
    {
      "name": "Jane Doe",
      "relationship": "spouse",
      "phoneNumber": "+91-9876543211"
    }
  ],
  "trackingOptIn": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Tourist registered successfully",
  "data": {
    "tourist": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j1",
      "touristId": "TID-IND-2024-000001",
      "fullName": "John Doe",
      "phoneNumber": "+91-9876543210",
      "dateOfBirth": "1990-01-15",
      "nationality": "indian",
      "kycStatus": "verified",
      "verificationLevel": "verified",
      "safetyScore": 100,
      "riskLevel": "low",
      "trackingOptIn": true,
      "isActive": true,
      "validTill": "2025-01-15T00:00:00.000Z"
    }
  },
  "statusCode": 201
}
```

### 2. Get Tourist Dashboard
Get dashboard data for the authenticated tourist.

**Endpoint:** `GET /tourists/dashboard`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "tourist": {
      "touristId": "TID-IND-2024-000001",
      "fullName": "John Doe",
      "safetyScore": 85,
      "riskLevel": "low",
      "verificationLevel": "verified",
      "validTill": "2025-01-15T00:00:00.000Z"
    },
    "stats": {
      "totalIncidents": 0,
      "familyMembers": 3,
      "locationSharing": true,
      "emergencyContacts": 2
    },
    "recentActivity": [
      {
        "type": "location_update",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "message": "Location updated successfully"
      }
    ],
    "alerts": [
      {
        "type": "info",
        "message": "Your tourist ID is valid for 351 more days",
        "priority": "low"
      }
    ]
  },
  "statusCode": 200
}
```

### 3. Get All Tourists
Get list of all tourists (admin functionality).

**Endpoint:** `GET /tourists`
**Authentication:** Required (Admin)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by name or tourist ID
- `status` (optional): Filter by verification status

**Success Response:**
```json
{
  "success": true,
  "message": "Tourists retrieved successfully",
  "data": {
    "tourists": [
      {
        "touristId": "TID-IND-2024-000001",
        "fullName": "John Doe",
        "nationality": "indian",
        "kycStatus": "verified",
        "safetyScore": 85,
        "riskLevel": "low",
        "isActive": true,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalItems": 95,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "statusCode": 200
}
```

### 4. Get Tourist by ID
Get detailed information about a specific tourist.

**Endpoint:** `GET /tourists/:id`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "Tourist details retrieved successfully",
  "data": {
    "tourist": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j1",
      "touristId": "TID-IND-2024-000001",
      "fullName": "John Doe",
      "phoneNumber": "+91-9876543210",
      "dateOfBirth": "1990-01-15",
      "nationality": "indian",
      "kycStatus": "verified",
      "verificationLevel": "verified",
      "safetyScore": 85,
      "riskLevel": "low",
      "trackingOptIn": true,
      "isActive": true,
      "profilePicture": "https://res.cloudinary.com/yatraId/image/upload/v1234567890/profiles/TID-IND-2024-000001.jpg",
      "qrCode": "https://res.cloudinary.com/yatraId/image/upload/v1234567890/qr_codes/TID-IND-2024-000001.png",
      "emergencyContacts": [
        {
          "name": "Jane Doe",
          "relationship": "spouse",
          "phoneNumber": "+91-9876543211"
        }
      ],
      "validTill": "2025-01-15T00:00:00.000Z",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  },
  "statusCode": 200
}
```

### 5. Update Tourist
Update tourist profile information.

**Endpoint:** `PUT /tourists/:id`
**Authentication:** Required

**Request Body:**
```json
{
  "phoneNumber": "+91-9876543210",
  "emergencyContacts": [
    {
      "name": "Jane Doe",
      "relationship": "spouse",
      "phoneNumber": "+91-9876543211"
    }
  ],
  "trackingOptIn": false
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Tourist profile updated successfully",
  "data": {
    "tourist": {
      "touristId": "TID-IND-2024-000001",
      "fullName": "John Doe",
      "phoneNumber": "+91-9876543210",
      "emergencyContacts": [
        {
          "name": "Jane Doe",
          "relationship": "spouse",
          "phoneNumber": "+91-9876543211"
        }
      ],
      "trackingOptIn": false,
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  },
  "statusCode": 200
}
```

### 6. Upload Profile Image
Upload or update tourist profile image.

**Endpoint:** `POST /tourists/profile-image`
**Authentication:** Required
**Content-Type:** `multipart/form-data`

**Request Body (Form Data):**
- `profileImage` or `profilePicture`: Image file (JPEG, PNG)

**Success Response:**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "profilePicture": "https://res.cloudinary.com/yatraId/image/upload/v1234567890/profiles/TID-IND-2024-000001.jpg",
    "cloudinaryId": "profiles/TID-IND-2024-000001"
  },
  "statusCode": 200
}
```

### 7. Raise Panic Alert
Trigger emergency panic alert with current location.

**Endpoint:** `POST /tourists/:id/panic`
**Authentication:** Required

**Request Body:**
```json
{
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "accuracy": 10
  },
  "message": "Emergency help needed",
  "severity": "high"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Panic alert raised successfully! Emergency contacts notified.",
  "data": {
    "alertId": "alert_64f5a1b2c3d4e5f6g7h8i9j2",
    "touristId": "TID-IND-2024-000001",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090
    },
    "timestamp": "2024-01-15T11:30:00.000Z",
    "severity": "high",
    "notificationsSent": 3,
    "emergencyServicesAlerted": true
  },
  "statusCode": 200
}
```

### 8. Update Safety Score
Update the safety score for a tourist (admin functionality).

**Endpoint:** `POST /tourists/:id/safety-score`
**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "safetyScore": 75,
  "reason": "Incident reported in the area",
  "riskLevel": "medium"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Safety score updated successfully",
  "data": {
    "touristId": "TID-IND-2024-000001",
    "previousScore": 85,
    "newScore": 75,
    "riskLevel": "medium",
    "updatedBy": "admin",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  },
  "statusCode": 200
}
```

---

## 🔧 Admin Tourist APIs

Admin-specific tourist management endpoints under `/api/tourists/admin`.

### 1. Search Tourist by ID
Search for a tourist by their tourist ID or name.

**Endpoint:** `GET /tourists/admin/search`
**Authentication:** Required (Admin)

**Query Parameters:**
- `touristId` (optional): Tourist ID to search
- `name` (optional): Tourist name to search
- `phone` (optional): Phone number to search

**Success Response:**
```json
{
  "success": true,
  "message": "Tourist search completed",
  "data": {
    "tourists": [
      {
        "touristId": "TID-IND-2024-000001",
        "fullName": "John Doe",
        "phoneNumber": "+91-9876543210",
        "nationality": "indian",
        "kycStatus": "verified",
        "safetyScore": 85,
        "riskLevel": "low",
        "isActive": true,
        "lastLocation": {
          "latitude": 28.6139,
          "longitude": 77.2090,
          "timestamp": "2024-01-15T12:00:00.000Z"
        }
      }
    ],
    "totalFound": 1
  },
  "statusCode": 200
}
```

### 2. Get Tourist Analytics
Get comprehensive analytics about tourist activities.

**Endpoint:** `GET /tourists/admin/analytics`
**Authentication:** Required (Admin)

**Query Parameters:**
- `startDate` (optional): Start date for analytics
- `endDate` (optional): End date for analytics
- `touristId` (optional): Specific tourist ID

**Success Response:**
```json
{
  "success": true,
  "message": "Tourist analytics retrieved successfully",
  "data": {
    "overview": {
      "totalTourists": 150,
      "activeTourists": 142,
      "verifiedTourists": 138,
      "avgSafetyScore": 87.5
    },
    "registrations": {
      "today": 5,
      "thisWeek": 23,
      "thisMonth": 67
    },
    "kycStats": {
      "indian": 89,
      "international": 53,
      "pending": 8,
      "failed": 0
    },
    "riskDistribution": {
      "low": 120,
      "medium": 25,
      "high": 5,
      "critical": 0
    },
    "locationTracking": {
      "opted_in": 135,
      "opted_out": 15
    }
  },
  "statusCode": 200
}
```

### 3. Get Heat Map Data
Get location data for heat map visualization.

**Endpoint:** `GET /tourists/admin/heatmap`
**Authentication:** Required (Admin)

**Query Parameters:**
- `startDate` (optional): Start date for data
- `endDate` (optional): End date for data
- `bounds` (optional): Geographic bounds (JSON string)

**Success Response:**
```json
{
  "success": true,
  "message": "Heat map data retrieved successfully",
  "data": {
    "locations": [
      {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "intensity": 25,
        "touristCount": 15
      },
      {
        "latitude": 28.6189,
        "longitude": 77.2145,
        "intensity": 18,
        "touristCount": 12
      }
    ],
    "hotspots": [
      {
        "name": "Red Fort",
        "coordinates": [28.6562, 77.2410],
        "touristCount": 45,
        "avgSafetyScore": 92
      }
    ],
    "statistics": {
      "totalDataPoints": 1250,
      "timeRange": "2024-01-01 to 2024-01-15",
      "coverage": "Delhi NCR"
    }
  },
  "statusCode": 200
}
```

### 4. Get SOS Alerts
Get all SOS/panic alerts for monitoring.

**Endpoint:** `GET /tourists/admin/sos-alerts`
**Authentication:** Required (Admin)

**Query Parameters:**
- `status` (optional): Alert status (active, resolved, dismissed)
- `severity` (optional): Alert severity (low, medium, high, critical)
- `startDate` (optional): Start date for alerts
- `endDate` (optional): End date for alerts

**Success Response:**
```json
{
  "success": true,
  "message": "SOS alerts retrieved successfully",
  "data": {
    "alerts": [
      {
        "alertId": "alert_64f5a1b2c3d4e5f6g7h8i9j2",
        "touristId": "TID-IND-2024-000001",
        "touristName": "John Doe",
        "severity": "high",
        "status": "active",
        "location": {
          "latitude": 28.6139,
          "longitude": 77.2090,
          "address": "Connaught Place, New Delhi"
        },
        "message": "Emergency help needed",
        "timestamp": "2024-01-15T11:30:00.000Z",
        "responseTime": null,
        "assignedOfficer": null
      }
    ],
    "statistics": {
      "total": 1,
      "active": 1,
      "resolved": 0,
      "averageResponseTime": "5.2 minutes"
    }
  },
  "statusCode": 200
}
```

### 5. Update Risk Score
Update risk score for a tourist based on AI analysis.

**Endpoint:** `POST /tourists/admin/risk-score`
**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "touristId": "TID-IND-2024-000001",
  "riskScore": 75,
  "riskLevel": "medium",
  "factors": [
    "Visited high-risk area",
    "Late night movement pattern"
  ],
  "aiConfidence": 0.87
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Risk score updated successfully",
  "data": {
    "touristId": "TID-IND-2024-000001",
    "previousRiskScore": 85,
    "newRiskScore": 75,
    "riskLevel": "medium",
    "factors": [
      "Visited high-risk area",
      "Late night movement pattern"
    ],
    "updatedBy": "admin_user_id",
    "timestamp": "2024-01-15T13:00:00.000Z"
  },
  "statusCode": 200
}
```

### 6. Generate QR Code
Generate QR code for verified tourist.

**Endpoint:** `POST /tourists/admin/qr-code/:touristId`
**Authentication:** Required (Admin)

**Success Response:**
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "touristId": "TID-IND-2024-000001",
    "qrCodeUrl": "https://res.cloudinary.com/yatraId/image/upload/v1234567890/qr_codes/TID-IND-2024-000001.png",
    "qrCodeData": "YatraID:TID-IND-2024-000001:John Doe:2024-01-15",
    "expiresAt": "2025-01-15T00:00:00.000Z"
  },
  "statusCode": 200
}
```

---

## 👨‍👩‍👧‍👦 Family Management APIs

All family management endpoints are under `/api/family` and require authentication.

### 1. Create Family
Create a new family group for the authenticated user.

**Endpoint:** `POST /family/create`
**Authentication:** Required

**Request Body:**
```json
{
  "familyName": "Doe Family",
  "shareLocation": true,
  "emergencyNotifications": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Family created successfully",
  "data": {
    "family": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j3",
      "primaryTouristId": "TID-IND-2024-000001",
      "primaryUserId": "64f5a1b2c3d4e5f6g7h8i9j0",
      "familyName": "Doe Family",
      "members": [],
      "shareLocation": true,
      "emergencyNotifications": true,
      "createdAt": "2024-01-15T14:00:00.000Z"
    }
  },
  "statusCode": 201
}
```

### 2. Get Family
Get current user's family details and members.

**Endpoint:** `GET /family`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "Family details retrieved successfully",
  "data": {
    "family": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j3",
      "primaryTouristId": "TID-IND-2024-000001",
      "familyName": "Doe Family",
      "shareLocation": true,
      "emergencyNotifications": true,
      "members": [
        {
          "touristId": "TID-IND-2024-000002",
          "fullName": "Jane Doe",
          "relationship": "spouse",
          "phoneNumber": "+91-9876543211",
          "emergencyContact": true,
          "addedAt": "2024-01-15T14:30:00.000Z"
        },
        {
          "touristId": "TID-IND-2024-000003",
          "fullName": "Alice Doe",
          "relationship": "child",
          "phoneNumber": "+91-9876543212",
          "emergencyContact": false,
          "addedAt": "2024-01-15T15:00:00.000Z"
        }
      ],
      "totalMembers": 2
    }
  },
  "statusCode": 200
}
```

### 3. Update Family Settings
Update family sharing and notification preferences.

**Endpoint:** `PUT /family/settings`
**Authentication:** Required

**Request Body:**
```json
{
  "familyName": "Updated Doe Family",
  "shareLocation": false,
  "emergencyNotifications": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Family settings updated successfully",
  "data": {
    "family": {
      "familyName": "Updated Doe Family",
      "shareLocation": false,
      "emergencyNotifications": true,
      "updatedAt": "2024-01-15T16:00:00.000Z"
    }
  },
  "statusCode": 200
}
```

### 4. Add Family Member
Add a new member to the family by tourist ID.

**Endpoint:** `POST /family/members`
**Authentication:** Required

**Request Body:**
```json
{
  "touristId": "TID-IND-2024-000002",
  "relationship": "spouse",
  "emergencyContact": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Family member added successfully. Bidirectional relationship created.",
  "data": {
    "member": {
      "touristId": "TID-IND-2024-000002",
      "fullName": "Jane Doe",
      "relationship": "spouse",
      "phoneNumber": "+91-9876543211",
      "emergencyContact": true,
      "addedAt": "2024-01-15T14:30:00.000Z"
    },
    "bidirectionalCreated": true
  },
  "statusCode": 200
}
```

### 5. Remove Family Member
Remove a member from the family.

**Endpoint:** `DELETE /family/members/:touristId`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "Family member removed successfully. Bidirectional relationship removed.",
  "data": {
    "removedMember": {
      "touristId": "TID-IND-2024-000002",
      "fullName": "Jane Doe",
      "relationship": "spouse"
    },
    "remainingMembers": 1
  },
  "statusCode": 200
}
```

### 6. Update Family Member
Update family member details and relationship.

**Endpoint:** `PUT /family/members/:touristId`
**Authentication:** Required

**Request Body:**
```json
{
  "relationship": "spouse",
  "emergencyContact": false
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Family member updated successfully",
  "data": {
    "member": {
      "touristId": "TID-IND-2024-000002",
      "fullName": "Jane Doe",
      "relationship": "spouse",
      "phoneNumber": "+91-9876543211",
      "emergencyContact": false,
      "updatedAt": "2024-01-15T17:00:00.000Z"
    }
  },
  "statusCode": 200
}
```

### 7. Get Families as Member
Get all families where current user is a member (reverse lookup).

**Endpoint:** `GET /family/as-member`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "Family memberships retrieved successfully",
  "data": {
    "families": [
      {
        "familyId": "64f5a1b2c3d4e5f6g7h8i9j4",
        "primaryTouristId": "TID-IND-2024-000004",
        "primaryTouristName": "Bob Smith",
        "familyName": "Smith Family",
        "myRelationship": "child",
        "shareLocation": true,
        "emergencyNotifications": true,
        "addedAt": "2024-01-15T18:00:00.000Z"
      }
    ],
    "totalFamilies": 1
  },
  "statusCode": 200
}
```

### 8. Search Tourist for Family
Search for a tourist to add to family by tourist ID.

**Endpoint:** `GET /family/search/:touristId`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "Tourist found",
  "data": {
    "tourist": {
      "touristId": "TID-IND-2024-000005",
      "fullName": "Carol Johnson",
      "phoneNumber": "+91-9876543215",
      "nationality": "indian",
      "kycStatus": "verified",
      "isActive": true,
      "canAdd": true
    }
  },
  "statusCode": 200
}
```

---

## 📍 Location APIs

All location endpoints are under `/api/locations` and require authentication.

### 1. Update Location
Update current user's live location for real-time tracking.

**Endpoint:** `POST /locations/update`
**Authentication:** Required

**Request Body:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 10,
  "altitude": 200,
  "heading": 180,
  "speed": 25,
  "isSharing": true,
  "shareWithFamily": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Location updated successfully",
  "data": {
    "location": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j5",
      "touristId": "TID-IND-2024-000001",
      "currentLocation": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "accuracy": 10,
        "altitude": 200,
        "heading": 180,
        "speed": 25,
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      "isSharing": true,
      "shareWithFamily": true,
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    },
    "notifiedFamilyMembers": 3
  },
  "statusCode": 200
}
```

### 2. Get Family Locations
Get real-time locations of all family members for map display.

**Endpoint:** `GET /locations/family`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "Family locations retrieved successfully",
  "data": {
    "locations": [
      {
        "touristId": "TID-IND-2024-000002",
        "fullName": "Jane Doe",
        "relationship": "spouse",
        "location": {
          "latitude": 28.6200,
          "longitude": 77.2100,
          "accuracy": 8,
          "timestamp": "2024-01-15T10:25:00.000Z"
        },
        "safetyScore": 90,
        "riskLevel": "low",
        "isOnline": true
      },
      {
        "touristId": "TID-IND-2024-000003",
        "fullName": "Alice Doe",
        "relationship": "child",
        "location": {
          "latitude": 28.6150,
          "longitude": 77.2080,
          "accuracy": 12,
          "timestamp": "2024-01-15T10:20:00.000Z"
        },
        "safetyScore": 95,
        "riskLevel": "low",
        "isOnline": false
      }
    ],
    "mapCenter": {
      "latitude": 28.6166,
      "longitude": 77.2086
    },
    "totalMembers": 2
  },
  "statusCode": 200
}
```

### 3. Get Tourist Location
Get specific tourist's location (if permission granted).

**Endpoint:** `GET /locations/tourist/:touristId`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "Tourist location retrieved successfully",
  "data": {
    "location": {
      "touristId": "TID-IND-2024-000002",
      "fullName": "Jane Doe",
      "currentLocation": {
        "latitude": 28.6200,
        "longitude": 77.2100,
        "accuracy": 8,
        "timestamp": "2024-01-15T10:25:00.000Z"
      },
      "locationHistory": [
        {
          "latitude": 28.6180,
          "longitude": 77.2090,
          "timestamp": "2024-01-15T10:00:00.000Z"
        },
        {
          "latitude": 28.6190,
          "longitude": 77.2095,
          "timestamp": "2024-01-15T10:15:00.000Z"
        }
      ],
      "permissionLevel": "family",
      "lastActive": "2024-01-15T10:25:00.000Z"
    }
  },
  "statusCode": 200
}
```

### 4. Get Location Updates
Get real-time location updates for polling (optimized for frequent requests).

**Endpoint:** `GET /locations/updates`
**Authentication:** Required

**Query Parameters:**
- `since` (optional): ISO timestamp to get updates since that time

**Success Response:**
```json
{
  "success": true,
  "message": "Location updates retrieved successfully",
  "data": {
    "updates": [
      {
        "touristId": "TID-IND-2024-000002",
        "location": {
          "latitude": 28.6200,
          "longitude": 77.2100,
          "timestamp": "2024-01-15T10:25:00.000Z"
        },
        "updateType": "movement"
      }
    ],
    "lastSync": "2024-01-15T10:30:00.000Z",
    "hasMore": false
  },
  "statusCode": 200
}
```

### 5. Toggle Location Sharing
Turn location sharing on/off for the current user.

**Endpoint:** `POST /locations/toggle`
**Authentication:** Required

**Request Body:**
```json
{
  "isSharing": true,
  "shareWithFamily": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Location sharing settings updated successfully",
  "data": {
    "touristId": "TID-IND-2024-000001",
    "isSharing": true,
    "shareWithFamily": true,
    "updatedAt": "2024-01-15T11:00:00.000Z",
    "familyNotified": true
  },
  "statusCode": 200
}
```

### 6. Get Location Settings
Get current location sharing preferences and status.

**Endpoint:** `GET /locations/settings`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "Location settings retrieved successfully",
  "data": {
    "settings": {
      "touristId": "TID-IND-2024-000001",
      "isSharing": true,
      "shareWithFamily": true,
      "updateInterval": 300,
      "movementThreshold": 10,
      "emergencySharing": true,
      "lastLocationUpdate": "2024-01-15T10:30:00.000Z"
    },
    "permissions": {
      "canViewFamily": true,
      "canShareEmergency": true,
      "familyCanView": true
    }
  },
  "statusCode": 200
}
```

### 7. Update Location Settings
Update location sharing preferences and update intervals.

**Endpoint:** `PUT /locations/settings`
**Authentication:** Required

**Request Body:**
```json
{
  "updateInterval": 600,
  "movementThreshold": 20,
  "shareWithFamily": false,
  "isSharing": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Location settings updated successfully",
  "data": {
    "settings": {
      "updateInterval": 600,
      "movementThreshold": 20,
      "shareWithFamily": false,
      "isSharing": true,
      "updatedAt": "2024-01-15T12:00:00.000Z"
    }
  },
  "statusCode": 200
}
```

### 8. Emergency Location Broadcast
Broadcast emergency location to all family members and authorities.

**Endpoint:** `POST /locations/emergency`
**Authentication:** Required

**Request Body:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 5,
  "message": "Emergency situation - need immediate help"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Emergency location broadcast successful! All family members and authorities notified.",
  "data": {
    "emergencyId": "emergency_64f5a1b2c3d4e5f6g7h8i9j6",
    "touristId": "TID-IND-2024-000001",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "accuracy": 5,
      "timestamp": "2024-01-15T11:30:00.000Z"
    },
    "message": "Emergency situation - need immediate help",
    "notifications": {
      "familyMembers": 3,
      "emergencyContacts": 2,
      "authorities": 1
    },
    "emergencyCode": "EMG-2024-001",
    "locationSharingForced": true
  },
  "statusCode": 200
}
```

---

## 🚨 Incident Management APIs

All incident endpoints are under `/api/incidents` and require authentication.

### 1. Report Incident
Report a new incident with location and evidence.

**Endpoint:** `POST /incidents/report`
**Authentication:** Required

**Request Body:**
```json
{
  "touristId": "TID-IND-2024-000001",
  "type": "theft",
  "severity": "medium",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "Connaught Place, New Delhi"
  },
  "dateTime": "2024-01-15T11:30:00.000Z",
  "description": "Mobile phone stolen while walking in the market area",
  "witnesses": [
    {
      "name": "John Witness",
      "contact": "+91-9876543213",
      "statement": "Saw the incident happen near the fountain"
    }
  ],
  "reportedBy": {
    "name": "John Doe",
    "contact": "+91-9876543210",
    "relationship": "self"
  },
  "evidenceFiles": [
    "evidence_photo_1.jpg",
    "evidence_video_1.mp4"
  ]
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Incident reported successfully. FIR number generated.",
  "data": {
    "incident": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j7",
      "incidentId": "INC-2024-000001",
      "firNumber": "FIR-DL-2024-000001",
      "touristId": "TID-IND-2024-000001",
      "type": "theft",
      "severity": "medium",
      "status": "reported",
      "location": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "Connaught Place, New Delhi"
      },
      "dateTime": "2024-01-15T11:30:00.000Z",
      "reportedAt": "2024-01-15T12:00:00.000Z",
      "assignedOfficer": null,
      "blockchainHash": "0x1234567890abcdef..."
    },
    "notifications": {
      "familyMembers": 3,
      "emergencyContacts": 2,
      "authorities": 1
    }
  },
  "statusCode": 201
}
```

### 2. Get Incident
Get detailed information about a specific incident.

**Endpoint:** `GET /incidents/:incidentId`
**Authentication:** Required

**Success Response:**
```json
{
  "success": true,
  "message": "Incident details retrieved successfully",
  "data": {
    "incident": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j7",
      "incidentId": "INC-2024-000001",
      "firNumber": "FIR-DL-2024-000001",
      "touristId": "TID-IND-2024-000001",
      "touristName": "John Doe",
      "type": "theft",
      "severity": "medium",
      "status": "under_investigation",
      "location": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "address": "Connaught Place, New Delhi"
      },
      "dateTime": "2024-01-15T11:30:00.000Z",
      "description": "Mobile phone stolen while walking in the market area",
      "witnesses": [
        {
          "name": "John Witness",
          "contact": "+91-9876543213",
          "statement": "Saw the incident happen near the fountain"
        }
      ],
      "evidenceFiles": [
        {
          "filename": "evidence_photo_1.jpg",
          "url": "https://ipfs.io/ipfs/QmX1Y2Z3...",
          "type": "image",
          "uploadedAt": "2024-01-15T12:00:00.000Z"
        }
      ],
      "assignedOfficer": {
        "name": "Officer Smith",
        "badgeNumber": "DL001",
        "contact": "+91-9876543214"
      },
      "statusHistory": [
        {
          "status": "reported",
          "timestamp": "2024-01-15T12:00:00.000Z",
          "updatedBy": "tourist"
        },
        {
          "status": "under_investigation",
          "timestamp": "2024-01-15T13:00:00.000Z",
          "updatedBy": "officer"
        }
      ],
      "blockchainHash": "0x1234567890abcdef..."
    }
  },
  "statusCode": 200
}
```

### 3. Get All Incidents (Admin)
Get list of all incidents for admin dashboard.

**Endpoint:** `GET /incidents/admin/`
**Authentication:** Required (Admin)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by incident status
- `type` (optional): Filter by incident type
- `severity` (optional): Filter by severity level

**Success Response:**
```json
{
  "success": true,
  "message": "Incidents retrieved successfully",
  "data": {
    "incidents": [
      {
        "incidentId": "INC-2024-000001",
        "firNumber": "FIR-DL-2024-000001",
        "touristId": "TID-IND-2024-000001",
        "touristName": "John Doe",
        "type": "theft",
        "severity": "medium",
        "status": "under_investigation",
        "location": {
          "address": "Connaught Place, New Delhi"
        },
        "reportedAt": "2024-01-15T12:00:00.000Z",
        "assignedOfficer": "Officer Smith"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 45,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "total": 45,
      "pending": 12,
      "under_investigation": 20,
      "resolved": 10,
      "closed": 3
    }
  },
  "statusCode": 200
}
```

### 4. Update Incident Status (Admin)
Update the status of an incident.

**Endpoint:** `PUT /incidents/admin/:incidentId/status`
**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "status": "resolved",
  "officerNotes": "Case resolved, stolen item recovered",
  "assignedOfficer": "Officer Smith",
  "resolution": "Item recovered and returned to tourist"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Incident status updated successfully",
  "data": {
    "incident": {
      "incidentId": "INC-2024-000001",
      "previousStatus": "under_investigation",
      "newStatus": "resolved",
      "updatedBy": "admin_user_id",
      "updatedAt": "2024-01-15T15:00:00.000Z",
      "officerNotes": "Case resolved, stolen item recovered",
      "resolution": "Item recovered and returned to tourist"
    },
    "notificationsSent": {
      "tourist": true,
      "family": true,
      "assignedOfficer": true
    }
  },
  "statusCode": 200
}
```

### 5. Generate FIR (Admin)
Generate official FIR document for an incident.

**Endpoint:** `POST /incidents/admin/:incidentId/fir`
**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "officerName": "Officer Smith",
  "badgeNumber": "DL001",
  "stationCode": "PS-CP-001",
  "additionalNotes": "All evidence has been collected and verified"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "FIR generated successfully",
  "data": {
    "fir": {
      "firNumber": "FIR-DL-2024-000001",
      "incidentId": "INC-2024-000001",
      "documentUrl": "https://res.cloudinary.com/yatraId/raw/upload/v1234567890/fir/FIR-DL-2024-000001.pdf",
      "ipfsHash": "QmFIR123...",
      "generatedAt": "2024-01-15T16:00:00.000Z",
      "generatedBy": {
        "officerName": "Officer Smith",
        "badgeNumber": "DL001",
        "stationCode": "PS-CP-001"
      },
      "status": "generated",
      "digitalSignature": "0xabcdef123..."
    }
  },
  "statusCode": 200
}
```

### 6. Get Incident Statistics (Admin)
Get comprehensive incident statistics for dashboard.

**Endpoint:** `GET /incidents/admin/statistics`
**Authentication:** Required (Admin)

**Query Parameters:**
- `startDate` (optional): Start date for statistics
- `endDate` (optional): End date for statistics
- `region` (optional): Filter by geographic region

**Success Response:**
```json
{
  "success": true,
  "message": "Incident statistics retrieved successfully",
  "data": {
    "overview": {
      "totalIncidents": 150,
      "pendingIncidents": 25,
      "resolvedIncidents": 110,
      "averageResolutionTime": "72 hours"
    },
    "byType": {
      "theft": 45,
      "harassment": 30,
      "accident": 25,
      "fraud": 20,
      "assault": 15,
      "other": 15
    },
    "bySeverity": {
      "low": 60,
      "medium": 55,
      "high": 25,
      "critical": 10
    },
    "byLocation": [
      {
        "area": "Connaught Place",
        "incidents": 20,
        "riskLevel": "medium"
      },
      {
        "area": "Red Fort",
        "incidents": 15,
        "riskLevel": "low"
      }
    ],
    "trends": {
      "thisMonth": 12,
      "lastMonth": 8,
      "percentageChange": "+50%",
      "peakHours": ["10:00-12:00", "16:00-18:00"]
    }
  },
  "statusCode": 200
}
```

---

## 🚫 Restricted Zone APIs

Manage restricted/high-risk zones for tourist safety.

### 1. Create Restricted Zone
Create a new restricted zone (admin only).

**Endpoint:** `POST /tourists/admin/restricted-zones`
**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "name": "High Crime Area - Sector 15",
  "description": "Area with high incidents of theft and harassment",
  "coordinates": [
    {"lat": 28.6100, "lng": 77.2000},
    {"lat": 28.6120, "lng": 77.2020},
    {"lat": 28.6110, "lng": 77.2030},
    {"lat": 28.6090, "lng": 77.2010}
  ],
  "severity": "high",
  "isActive": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Restricted zone created successfully",
  "data": {
    "zone": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j8",
      "name": "High Crime Area - Sector 15",
      "description": "Area with high incidents of theft and harassment",
      "coordinates": [
        {"lat": 28.6100, "lng": 77.2000},
        {"lat": 28.6120, "lng": 77.2020},
        {"lat": 28.6110, "lng": 77.2030},
        {"lat": 28.6090, "lng": 77.2010}
      ],
      "severity": "high",
      "isActive": true,
      "createdBy": "admin_user_id",
      "createdAt": "2024-01-15T17:00:00.000Z"
    }
  },
  "statusCode": 201
}
```

### 2. Get Restricted Zones
Get all active restricted zones.

**Endpoint:** `GET /tourists/admin/restricted-zones`
**Authentication:** Optional

**Success Response:**
```json
{
  "success": true,
  "message": "Restricted zones retrieved successfully",
  "data": {
    "zones": [
      {
        "_id": "64f5a1b2c3d4e5f6g7h8i9j8",
        "name": "High Crime Area - Sector 15",
        "description": "Area with high incidents of theft and harassment",
        "coordinates": [
          {"lat": 28.6100, "lng": 77.2000},
          {"lat": 28.6120, "lng": 77.2020},
          {"lat": 28.6110, "lng": 77.2030},
          {"lat": 28.6090, "lng": 77.2010}
        ],
        "severity": "high",
        "isActive": true,
        "createdAt": "2024-01-15T17:00:00.000Z"
      }
    ],
    "totalZones": 1
  },
  "statusCode": 200
}
```

### 3. Update Restricted Zone
Update an existing restricted zone.

**Endpoint:** `PUT /tourists/admin/restricted-zones/:id`
**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "name": "Updated High Crime Area - Sector 15",
  "severity": "critical",
  "isActive": true
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Restricted zone updated successfully",
  "data": {
    "zone": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j8",
      "name": "Updated High Crime Area - Sector 15",
      "severity": "critical",
      "isActive": true,
      "updatedAt": "2024-01-15T18:00:00.000Z"
    }
  },
  "statusCode": 200
}
```

### 4. Delete Restricted Zone
Delete a restricted zone.

**Endpoint:** `DELETE /tourists/admin/restricted-zones/:id`
**Authentication:** Required (Admin)

**Success Response:**
```json
{
  "success": true,
  "message": "Restricted zone deleted successfully",
  "data": {
    "deletedZoneId": "64f5a1b2c3d4e5f6g7h8i9j8",
    "deletedAt": "2024-01-15T19:00:00.000Z"
  },
  "statusCode": 200
}
```

---

## 🧪 Test API

Simple test endpoint to verify API connectivity.

**Endpoint:** `GET /test`
**Authentication:** Not Required

**Success Response:**
```json
{
  "success": true,
  "message": "Test route is working",
  "data": {
    "message": "Test route is working"
  },
  "statusCode": 200
}
```

---

## ❌ Error Response Formats

All API endpoints follow consistent error response formats for better debugging and error handling.

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success - Request completed successfully |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request data or parameters |
| 401 | Unauthorized - Authentication required or invalid token |
| 403 | Forbidden - Access denied (insufficient permissions) |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists or conflict |
| 422 | Unprocessable Entity - Validation errors |
| 500 | Internal Server Error - Server-side error |

### Error Response Structure

**Standard Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400,
  "error": {
    "type": "ValidationError",
    "field": "email",
    "details": "Email format is invalid"
  }
}
```

**Validation Error Response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "statusCode": 422,
  "errors": [
    {
      "field": "phoneNumber",
      "message": "Phone number is required",
      "code": "REQUIRED_FIELD"
    },
    {
      "field": "email",
      "message": "Email format is invalid",
      "code": "INVALID_FORMAT"
    }
  ]
}
```

**Authentication Error Response:**
```json
{
  "success": false,
  "message": "Authentication failed",
  "statusCode": 401,
  "error": {
    "type": "AuthenticationError",
    "code": "INVALID_TOKEN",
    "details": "JWT token is expired or invalid"
  }
}
```

**Authorization Error Response:**
```json
{
  "success": false,
  "message": "Access denied",
  "statusCode": 403,
  "error": {
    "type": "AuthorizationError",
    "code": "INSUFFICIENT_PERMISSIONS",
    "details": "Admin access required for this operation"
  }
}
```

**Resource Not Found Error:**
```json
{
  "success": false,
  "message": "Tourist not found",
  "statusCode": 404,
  "error": {
    "type": "NotFoundError",
    "resource": "Tourist",
    "identifier": "TID-IND-2024-000001"
  }
}
```

**Conflict Error Response:**
```json
{
  "success": false,
  "message": "Resource already exists",
  "statusCode": 409,
  "error": {
    "type": "ConflictError",
    "field": "email",
    "details": "Email address is already registered"
  }
}
```

**Server Error Response:**
```json
{
  "success": false,
  "message": "Internal server error",
  "statusCode": 500,
  "error": {
    "type": "ServerError",
    "code": "DATABASE_CONNECTION_FAILED",
    "details": "Database connection timeout"
  }
}
```

### API-Specific Error Codes

#### Authentication Errors
- `INVALID_CREDENTIALS` - Wrong email or password
- `EXPIRED_TOKEN` - JWT token has expired
- `INVALID_TOKEN` - Malformed or invalid JWT token
- `ACCOUNT_LOCKED` - Account temporarily locked
- `OTP_EXPIRED` - OTP has expired
- `INVALID_OTP` - Wrong OTP provided

#### KYC Errors
- `KYC_ALREADY_VERIFIED` - KYC already completed
- `INVALID_AADHAAR` - Invalid Aadhaar number format
- `INVALID_PASSPORT` - Invalid passport number format
- `KYC_VERIFICATION_FAILED` - KYC verification failed
- `DOCUMENT_UPLOAD_FAILED` - Document upload failed

#### Tourist Management Errors
- `TOURIST_NOT_FOUND` - Tourist profile not found
- `INVALID_TOURIST_ID` - Invalid tourist ID format
- `TOURIST_ALREADY_EXISTS` - Tourist profile already exists
- `PROFILE_INCOMPLETE` - Tourist profile is incomplete

#### Family Management Errors
- `FAMILY_NOT_FOUND` - Family group not found
- `MEMBER_ALREADY_EXISTS` - Family member already added
- `INVALID_RELATIONSHIP` - Invalid relationship type
- `MAX_MEMBERS_EXCEEDED` - Maximum family members limit reached

#### Location Errors
- `LOCATION_SHARING_DISABLED` - Location sharing is disabled
- `INVALID_COORDINATES` - Invalid latitude/longitude values
- `LOCATION_PERMISSION_DENIED` - No permission to view location
- `GPS_UNAVAILABLE` - GPS signal unavailable

#### Incident Errors
- `INCIDENT_NOT_FOUND` - Incident not found
- `INVALID_INCIDENT_TYPE` - Invalid incident type
- `EVIDENCE_UPLOAD_FAILED` - Evidence file upload failed
- `FIR_GENERATION_FAILED` - FIR document generation failed

### Rate Limiting Errors

When API rate limits are exceeded:

```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "statusCode": 429,
  "error": {
    "type": "RateLimitError",
    "limit": 100,
    "remaining": 0,
    "resetTime": "2024-01-15T12:00:00.000Z",
    "retryAfter": 3600
  }
}
```

---

## 📞 Support & Contact

For API support, technical assistance, or integration help:

- **Email**: support@yatraid.com
- **Documentation**: https://docs.yatraid.com
- **Status Page**: https://status.yatraid.com
- **GitHub Issues**: https://github.com/yatraId/backend/issues

---

## 📄 License

This API documentation is proprietary to YatraID. All rights reserved.

**Last Updated**: January 15, 2024  
**API Version**: v1.0.0  
**Documentation Version**: 1.0
```

### 1. Combined Registration with KYC
Register a new user with KYC data in one step (Updated: phoneNumber and dateOfBirth extracted from KYC).

**Endpoint:** `POST /auth/register-with-kyc`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "emergencyContacts": [
    {
      "name": "Jane Doe",
      "relationship": "spouse",
      "phoneNumber": "+91-9876543211"
    }
  ],
  "trackingOptIn": true,
  "kycType": "indian",
  "aadhaarNumber": "123456789012",
  "address": "123 Main Street, City, State, 123456"
}
```

**For International KYC:**
```json
{
  "fullName": "John Smith",
  "email": "john.smith@example.com",
  "password": "securePassword123",
  "emergencyContacts": [
    {
      "name": "Jane Smith",
      "relationship": "spouse",
      "phoneNumber": "+1-555-123-4567"
    }
  ],
  "trackingOptIn": true,
  "kycType": "international",
  "passportNumber": "P123456789",
  "nationality": "american",
  "passportExpiryDate": "2030-12-25"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration initiated! OTP sent to your email. Your Tourist ID will be valid for 30 days from registration.",
  "email": "john.doe@example.com",
  "kycType": "indian",
  "validityPeriod": "30 days",
  "expiresIn": 600,
  "nextStep": "Verify OTP using /api/auth/verify-combined-registration endpoint"
}
```

### 2. Verify Combined Registration OTP
Verify the OTP sent during registration to complete the process.

**Endpoint:** `POST /auth/verify-combined-registration`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration completed successfully! Welcome to YatraId.",
  "data": {
    "user": {
      "_id": "60d5ec49e5b32c1a2c8b4567",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "walletAddress": "0x742d35Cc6634C0532925a3b8D94332E02C35AbC",
      "kycStatus": "verified",
      "kycType": "indian"
    },
    "tourist": {
      "_id": "60d5ec49e5b32c1a2c8b4568",
      "touristId": "TID-IND-2024-000001",
      "fullName": "John Doe",
      "nationality": "indian",
      "validUntil": "2024-10-15T12:00:00.000Z",
      "qrCode": {
        "cloudinaryUrl": "https://res.cloudinary.com/...",
        "scanData": "YatraId:TID-IND-2024-000001"
      }
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Login
Standard email/password login.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "60d5ec49e5b32c1a2c8b4567",
  "walletAddress": "0x742d35Cc6634C0532925a3b8D94332E02C35AbC",
  "kycStatus": "verified",
  "kycType": "indian"
}
```

### 4. Google Login
Login using Google OAuth token.

**Endpoint:** `POST /auth/google-login`

**Request Body:**
```json
{
  "tokenId": "google_oauth_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "60d5ec49e5b32c1a2c8b4567",
  "walletAddress": "0x742d35Cc6634C0532925a3b8D94332E02C35AbC",
  "kycStatus": "pending"
}
```

---

## 👤 Tourist Management Endpoints

*All tourist endpoints require JWT authentication via Authorization header*

### 1. Register Tourist Profile (Legacy)
Create a tourist profile for authenticated user.

**Endpoint:** `POST /tourists/register`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "phoneNumber": "+91-9876543210",
  "dateOfBirth": "1990-05-15",
  "emergencyContacts": [
    {
      "name": "Jane Doe",
      "relationship": "spouse",
      "phoneNumber": "+91-9876543211"
    }
  ],
  "validUntil": 1735689600,
  "trackingOptIn": true,
  "ownerWallet": "0x742d35Cc6634C0532925a3b8D94332E02C35AbC"
}
```

### 2. Get Tourist Profile
Get tourist profile by ID.

**Endpoint:** `GET /tourists/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec49e5b32c1a2c8b4568",
    "touristId": "TID-IND-2024-000001",
    "fullName": "John Doe",
    "phoneNumber": "+91-9876543210",
    "nationality": "indian",
    "validUntil": "2024-10-15T12:00:00.000Z",
    "kyc": {
      "status": "verified",
      "method": "digilocker"
    },
    "safetyScore": 85,
    "riskScore": 15,
    "qrCode": {
      "cloudinaryUrl": "https://res.cloudinary.com/...",
      "scanData": "YatraId:TID-IND-2024-000001"
    }
  }
}
```

### 3. Update Tourist Profile
Update tourist profile information.

**Endpoint:** `PUT /tourists/:id`

**Request Body:**
```json
{
  "phoneNumber": "+91-9876543210",
  "emergencyContacts": [
    {
      "name": "Jane Doe",
      "relationship": "spouse",
      "phoneNumber": "+91-9876543211"
    }
  ],
  "trackingOptIn": true
}
```

### 4. Get Tourist Dashboard
Get comprehensive dashboard data for tourist.

**Endpoint:** `GET /tourists/dashboard`

**Response:**
```json
{
  "success": true,
  "data": {
    "tourist": {
      "touristId": "TID-IND-2024-000001",
      "fullName": "John Doe",
      "safetyScore": 85,
      "riskScore": 15
    },
    "recentIncidents": [],
    "familyMembers": 3,
    "recentAlerts": [],
    "stats": {
      "totalIncidents": 0,
      "resolvedIncidents": 0,
      "activePanics": 0
    }
  }
}
```

### 5. Raise Panic/SOS Alert
Emergency SOS alert with location and evidence.

**Endpoint:** `POST /tourists/:id/panic`

**Request Body:**
```json
{
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "India Gate, New Delhi"
  },
  "evidence": {
    "photos": ["image1_url", "image2_url"],
    "audio": "audio_recording_url",
    "notes": "Additional emergency information"
  },
  "description": "Emergency situation requiring immediate assistance"
}
```

**Response:**
```json
{
  "success": true,
  "message": "SOS raised successfully. Emergency services have been notified.",
  "emergencyNumber": "+91-100"
}
```

### 6. Upload Profile Image
Upload profile picture for tourist.

**Endpoint:** `POST /tourists/profile-image`
**Content-Type:** `multipart/form-data`

**Form Data:**
- `profileImage` or `profilePicture`: Image file (max 10MB)

**Response:**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "imageUrl": "https://cloudinary_url/profile_image.jpg"
}
```

### 7. Update Safety Score
Update safety score for a tourist.

**Endpoint:** `POST /tourists/:id/safety-score`

**Request Body:**
```json
{
  "score": 85,
  "factors": ["location_safe", "time_safe", "no_recent_incidents"]
}
```

---

## 👨‍👩‍👧‍👦 Family Management Endpoints

*All family endpoints require JWT authentication*

### 1. Create Family Group
Create a new family group for the current user.

**Endpoint:** `POST /family/create`

**Request Body:**
```json
{
  "familyName": "The Doe Family",
  "shareLocation": true,
  "emergencyNotifications": true
}
```

**Response:**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "60d5ec49e5b32c1a2c8b4569",
    "primaryTouristId": "TID-IND-2024-000001",
    "familyName": "The Doe Family",
    "members": [],
    "shareLocation": true,
    "emergencyNotifications": true
  },
  "message": "Family group created successfully",
  "success": true
}
```

### 2. Add Family Member
Add a family member by their touristId.

**Endpoint:** `POST /family/members`

**Request Body:**
```json
{
  "touristId": "TID-IND-2024-000002",
  "relationship": "spouse",
  "emergencyContact": true
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "family": {
      "_id": "60d5ec49e5b32c1a2c8b4569",
      "members": [
        {
          "touristId": "TID-IND-2024-000002",
          "fullName": "Jane Doe",
          "relationship": "spouse",
          "emergencyContact": true,
          "addedAt": "2024-03-15T10:30:00.000Z"
        }
      ]
    }
  },
  "message": "Family member added successfully",
  "success": true
}
```

### 3. Get Family Details
Get current user's family group details.

**Endpoint:** `GET /family`

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "60d5ec49e5b32c1a2c8b4569",
    "primaryTouristId": "TID-IND-2024-000001",
    "familyName": "The Doe Family",
    "members": [
      {
        "touristId": "TID-IND-2024-000002",
        "fullName": "Jane Doe",
        "relationship": "spouse",
        "phoneNumber": "+91-9876543211",
        "emergencyContact": true,
        "addedAt": "2024-03-15T10:30:00.000Z"
      }
    ],
    "shareLocation": true,
    "emergencyNotifications": true
  },
  "message": "Family details retrieved successfully",
  "success": true
}
```

### 4. Remove Family Member
Remove a family member by their touristId.

**Endpoint:** `DELETE /family/members/:touristId`

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "removedMember": {
      "touristId": "TID-IND-2024-000002",
      "fullName": "Jane Doe",
      "relationship": "spouse"
    }
  },
  "message": "Family member removed successfully",
  "success": true
}
```

### 5. Update Family Settings
Update family group settings.

**Endpoint:** `PUT /family/settings`

**Request Body:**
```json
{
  "familyName": "Updated Family Name",
  "shareLocation": false,
  "emergencyNotifications": true
}
```

### 6. Update Family Member
Update family member details.

**Endpoint:** `PUT /family/members/:touristId`

**Request Body:**
```json
{
  "relationship": "parent",
  "emergencyContact": false
}
```

### 7. Get Families as Member
Get families where current user is a member.

**Endpoint:** `GET /family/as-member`

**Response:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "familyId": "60d5ec49e5b32c1a2c8b4569",
      "familyName": "The Smith Family",
      "primaryTourist": "TID-IND-2024-000003",
      "myRelationship": "child",
      "addedAt": "2024-03-15T10:30:00.000Z"
    }
  ],
  "message": "Families retrieved successfully",
  "success": true
}
```

### 8. Search Tourist for Family
Search for a tourist by their touristId to add to family.

**Endpoint:** `GET /family/search/:touristId`

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "touristId": "TID-IND-2024-000002",
    "fullName": "Jane Doe",
    "phoneNumber": "+91-9876543211",
    "canAdd": true
  },
  "message": "Tourist found and available for family addition",
  "success": true
}
```

---

## 🆔 KYC Verification Endpoints

*All KYC endpoints require JWT authentication*

### 1. Initiate Indian KYC
Start KYC verification process for Indian citizens.

**Endpoint:** `POST /kyc/indian/initiate`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "phoneNumber": "9876543210",
  "dateOfBirth": "1990-05-15",
  "aadhaarNumber": "123456789012",
  "address": "123 Main Street, New Delhi, 110001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your registered phone number",
  "phoneNumber": "9876543210",
  "expiresIn": 600
}
```

### 2. Verify Indian KYC OTP
Complete Indian KYC verification with OTP.

**Endpoint:** `POST /kyc/indian/verify-otp`

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Indian KYC verification completed successfully",
  "data": {
    "touristId": "TID-IND-2024-000001",
    "kycStatus": "verified",
    "nationality": "indian",
    "validUntil": "2024-10-15T12:00:00.000Z"
  }
}
```

### 3. Initiate International KYC
Start KYC verification for international tourists.

**Endpoint:** `POST /kyc/international/initiate`

**Request Body:**
```json
{
  "fullName": "John Smith",
  "phoneNumber": "+1-555-123-4567",
  "dateOfBirth": "1985-12-25",
  "passportNumber": "P123456789",
  "nationality": "american",
  "passportExpiryDate": "2030-12-25"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your registered phone number",
  "phoneNumber": "+1-555-123-4567",
  "expiresIn": 600
}
```

### 4. Verify International KYC OTP
Complete International KYC verification with OTP.

**Endpoint:** `POST /kyc/international/verify-otp`

**Request Body:**
```json
{
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "International KYC verification completed successfully",
  "data": {
    "touristId": "TID-INTL-2024-000001",
    "kycStatus": "verified",
    "nationality": "american",
    "validUntil": "2024-10-15T12:00:00.000Z"
  }
}
```

### 5. Get KYC Status
Get current KYC verification status.

**Endpoint:** `GET /kyc/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "kycStatus": "verified",
    "kycType": "indian",
    "touristId": "TID-IND-2024-000001",
    "verifiedAt": "2024-03-15T10:30:00.000Z",
    "validUntil": "2024-10-15T12:00:00.000Z"
  }
}
```

### 6. Retry Failed KYC
Retry failed KYC verification.

**Endpoint:** `POST /kyc/retry`

**Response:**
```json
{
  "success": true,
  "message": "KYC retry initiated. Please check your verification status."
}
```

---

## 📋 Incident Reporting Endpoints

*All incident endpoints require JWT authentication*

### 1. Report Incident
Report a new incident or emergency.

**Endpoint:** `POST /incidents/report`

**Request Body:**
```json
{
  "touristId": "60d5ec49e5b32c1a2c8b4568",
  "type": "theft",
  "severity": "high",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "India Gate, New Delhi"
  },
  "dateTime": "2024-03-15T14:30:00.000Z",
  "description": "Mobile phone and wallet stolen by two individuals on motorcycles",
  "witnesses": [
    {
      "name": "Witness 1",
      "contact": "+91-9876543212"
    }
  ],
  "reportedBy": {
    "name": "John Doe",
    "phoneNumber": "+91-9876543210",
    "relationship": "self"
  },
  "evidenceFiles": ["evidence1_url", "evidence2_url"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Incident reported successfully",
  "data": {
    "incidentId": "FIR-2024-000001",
    "status": "reported",
    "reportedAt": "2024-03-15T14:35:00.000Z",
    "evidenceCID": "QmX1234567890abcdef"
  }
}
```

### 2. Get Incident Details
Get details of a specific incident.

**Endpoint:** `GET /incidents/:incidentId`

**Response:**
```json
{
  "success": true,
  "data": {
    "incidentId": "FIR-2024-000001",
    "type": "theft",
    "severity": "high",
    "status": "under_investigation",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "address": "India Gate, New Delhi"
    },
    "description": "Mobile phone and wallet stolen by two individuals on motorcycles",
    "reportedAt": "2024-03-15T14:35:00.000Z",
    "updatedAt": "2024-03-15T16:20:00.000Z"
  }
}
```

### 3. Get All Incidents (Admin)
Get list of all incidents for admin dashboard.

**Endpoint:** `GET /incidents/admin/`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status
- `severity` (optional): Filter by severity

**Response:**
```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "incidentId": "FIR-2024-000001",
        "type": "theft",
        "severity": "high",
        "status": "under_investigation",
        "reportedAt": "2024-03-15T14:35:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalIncidents": 1,
      "hasNext": false
    }
  }
}
```

### 4. Update Incident Status (Admin)
Update the status of an incident.

**Endpoint:** `PUT /incidents/admin/:incidentId/status`

**Request Body:**
```json
{
  "status": "resolved",
  "notes": "Case resolved, stolen items recovered"
}
```

### 5. Generate e-FIR (Admin)
Generate electronic FIR for an incident.

**Endpoint:** `POST /incidents/admin/:incidentId/fir`

**Response:**
```json
{
  "success": true,
  "message": "e-FIR generated successfully",
  "data": {
    "firNumber": "FIR-2024-000001",
    "generatedAt": "2024-03-15T16:30:00.000Z",
    "downloadUrl": "https://example.com/fir/FIR-2024-000001.pdf"
  }
}
```

### 6. Get Incident Statistics (Admin)
Get comprehensive incident statistics.

**Endpoint:** `GET /incidents/admin/statistics`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalIncidents": 150,
    "byStatus": {
      "reported": 20,
      "under_investigation": 45,
      "resolved": 85
    },
    "bySeverity": {
      "low": 30,
      "medium": 70,
      "high": 40,
      "critical": 10
    },
    "byType": {
      "theft": 60,
      "accident": 30,
      "harassment": 25,
      "other": 35
    },
    "trendsLastMonth": {
      "totalIncidents": 25,
      "percentChange": 15.5
    }
  }
}
```

---

## 🔧 Admin Endpoints

*All admin endpoints require JWT authentication and admin privileges*

### 1. Get All Tourists
Get list of all registered tourists (Admin only).

**Endpoint:** `GET /tourists`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search by name or touristId

**Response:**
```json
{
  "success": true,
  "data": {
    "tourists": [
      {
        "touristId": "TID-IND-2024-000001",
        "fullName": "John Doe",
        "nationality": "indian",
        "kycStatus": "verified",
        "safetyScore": 85,
        "registeredAt": "2024-03-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalTourists": 100
    }
  }
}
```

### 2. Search Tourist by ID
Search for specific tourist by ID or touristId.

**Endpoint:** `GET /tourists/admin/search`

**Query Parameters:**
- `q`: Search query (touristId, name, or email)

**Response:**
```json
{
  "success": true,
  "data": {
    "tourist": {
      "touristId": "TID-IND-2024-000001",
      "fullName": "John Doe",
      "phoneNumber": "+91-9876543210",
      "nationality": "indian",
      "kycStatus": "verified",
      "safetyScore": 85,
      "recentActivity": []
    }
  }
}
```

### 3. Tourist Analytics
Get comprehensive analytics for tourists (Admin only).

**Endpoint:** `GET /tourists/admin/analytics`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTourists": 1250,
    "activeToday": 89,
    "kycVerified": 1100,
    "averageSafetyScore": 82.5,
    "registrationTrends": {
      "thisMonth": 125,
      "lastMonth": 98,
      "growth": 27.6
    },
    "safetyScoreDistribution": {
      "excellent": 450,
      "good": 600,
      "average": 150,
      "poor": 50
    }
  }
}
```

### 4. SOS Alerts Monitoring
Monitor all SOS alerts in real-time (Admin only).

**Endpoint:** `GET /tourists/admin/sos-alerts`

**Query Parameters:**
- `status` (optional): Filter by status (active, resolved)
- `limit` (optional): Number of alerts to return

**Response:**
```json
{
  "success": true,
  "data": {
    "activeAlerts": [
      {
        "touristId": "TID-IND-2024-000001",
        "fullName": "John Doe",
        "location": {
          "latitude": 28.6139,
          "longitude": 77.2090,
          "address": "India Gate, New Delhi"
        },
        "timestamp": "2024-03-15T14:30:00.000Z",
        "urgency": "high",
        "status": "active"
      }
    ],
    "recentAlerts": [],
    "stats": {
      "activeAlerts": 1,
      "resolvedToday": 5,
      "averageResponseTime": "8 minutes"
    }
  }
}
```

### 5. Heat Map Data
Get location-based heat map data for tourist activities (Admin only).

**Endpoint:** `GET /tourists/admin/heatmap`

**Query Parameters:**
- `timeframe` (optional): 1d, 7d, 30d (default: 7d)
- `type` (optional): incidents, sos, all

**Response:**
```json
{
  "success": true,
  "data": {
    "heatmapData": [
      {
        "location": {
          "latitude": 28.6139,
          "longitude": 77.2090
        },
        "intensity": 85,
        "count": 15,
        "type": "incidents"
      }
    ],
    "summary": {
      "totalPoints": 45,
      "highRiskAreas": 5,
      "timeframe": "7d"
    }
  }
}
```

### 6. Create Restricted Zone
Create a new restricted/dangerous zone (Admin only).

**Endpoint:** `POST /tourists/admin/restricted-zones`

**Request Body:**
```json
{
  "name": "High Crime Area",
  "description": "Area with increased criminal activity",
  "coordinates": [
    { "lat": 28.6139, "lng": 77.2090 },
    { "lat": 28.6140, "lng": 77.2091 },
    { "lat": 28.6141, "lng": 77.2092 }
  ],
  "severity": "high"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Restricted zone created successfully",
  "data": {
    "_id": "60d5ec49e5b32c1a2c8b4570",
    "name": "High Crime Area",
    "severity": "high",
    "isActive": true,
    "createdAt": "2024-03-15T16:30:00.000Z"
  }
}
```

### 7. Get Restricted Zones
Get all restricted zones.

**Endpoint:** `GET /tourists/admin/restricted-zones`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec49e5b32c1a2c8b4570",
      "name": "High Crime Area",
      "description": "Area with increased criminal activity",
      "coordinates": [
        { "lat": 28.6139, "lng": 77.2090 },
        { "lat": 28.6140, "lng": 77.2091 }
      ],
      "severity": "high",
      "isActive": true
    }
  ]
}
```

### 8. Update Risk Score
Update risk score for a tourist or area.

**Endpoint:** `POST /tourists/admin/risk-score`

**Request Body:**
```json
{
  "touristId": "TID-IND-2024-000001",
  "riskScore": 25,
  "factors": ["recent_incident", "high_crime_area"]
}
```

### 9. Generate QR Code
Generate QR code for verified tourist.

**Endpoint:** `POST /tourists/admin/qr-code/:touristId`

**Response:**
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "qrCodeUrl": "https://res.cloudinary.com/...",
    "scanData": "YatraId:TID-IND-2024-000001",
    "generatedAt": "2024-03-15T16:30:00.000Z"
  }
}
```

---

## 📋 Test Endpoints

### Health Check
Check if the API is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "OK",
  "message": "YatraID Backend is running",
  "timestamp": "2024-03-15T16:30:00.000Z",
  "environment": "development",
  "routes": [
    "/api/auth",
    "/api/tourists",
    "/api/kyc",
    "/api/incidents",
    "/api/family"
  ]
}
```

### Test Route
Simple test endpoint.

**Endpoint:** `GET /api/test`

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "message": "Test route is working"
  },
  "message": "Success",
  "success": true
}
```

---

## 🔑 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Token Expiry
- JWT tokens expire in 7 days
- Refresh tokens are not currently implemented
- Users need to login again after token expiry

---

## 📝 Response Format

All API responses follow a consistent format:

**Success Response:**
```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Success message",
  "success": true
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Error message",
  "success": false,
  "error": "Detailed error information"
}
```

---

## 🚨 Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 500 | Internal Server Error |

### Common Error Messages

**Authentication Errors:**
```json
{
  "statusCode": 401,
  "message": "Access denied. No token provided.",
  "success": false
}
```

**Validation Errors:**
```json
{
  "statusCode": 400,
  "message": "Missing required fields: fullName, email, password",
  "success": false
}
```

**Not Found Errors:**
```json
{
  "statusCode": 404,
  "message": "Tourist not found",
  "success": false
}
```

---

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication with 7-day expiry
- **Data Encryption**: Sensitive data encrypted before IPFS storage using AES-256
- **Blockchain Security**: Immutable evidence storage on IPFS with blockchain indexing
- **Input Validation**: Comprehensive request validation using Mongoose schemas
- **CORS Protection**: Configured CORS for secure cross-origin requests
- **Rate Limiting**: TODO - Implement rate limiting for API endpoints
- **SQL Injection Protection**: Using MongoDB with parameterized queries
- **XSS Protection**: Input sanitization and output encoding

---

## 🌐 Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=8080
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/yatraId
DB_NAME=tourist_safety

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
GOOGLE_CLIENT_ID=your_google_client_id

# Cloud Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# IPFS Storage
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# Email Service
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Encryption
ENCRYPTION_KEY=your_32_character_encryption_key
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository_url>
cd YatraId-Backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file with required variables (see Environment Variables section)

4. **Start MongoDB**
Make sure MongoDB is running on your system

5. **Start the development server**
```bash
npm run dev
```

6. **Build for production**
```bash
npm run build
npm start
```

### API Testing

You can test the API using tools like:
- **Postman**: Import the collection using the endpoints above
- **cURL**: Use command line to test endpoints
- **Thunder Client**: VS Code extension for API testing

### Sample Authentication Flow

1. Register with combined KYC: `POST /api/auth/register-with-kyc`
2. Verify OTP: `POST /api/auth/verify-combined-registration`
3. Use the returned JWT token for subsequent requests
4. Access protected endpoints with `Authorization: Bearer <token>`

---

## 🧪 API Testing Examples

### Using cURL

**Register User:**
```bash
curl -X POST http://localhost:8080/api/auth/register-with-kyc \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john.doe@example.com",
    "password": "securePassword123",
    "emergencyContacts": [{"name": "Jane Doe", "relationship": "spouse", "phoneNumber": "+91-9876543211"}],
    "trackingOptIn": true,
    "kycType": "indian",
    "aadhaarNumber": "123456789012",
    "address": "123 Main Street, City, State, 123456"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "securePassword123"
  }'
```

**Get Tourist Profile:**
```bash
curl -X GET http://localhost:8080/api/tourists/60d5ec49e5b32c1a2c8b4568 \
  -H "Authorization: Bearer your_jwt_token_here"
```

---

## 📞 Support

For API questions or issues:
- Create an issue in the repository
- Contact the development team
- Check the logs for detailed error information

---

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🔄 Changelog

### v2.0.0 (Latest)
- **BREAKING**: Removed phoneNumber and dateOfBirth from initial registration
- Enhanced QR code generation with Cloudinary integration
- Improved blockchain worker integration
- Added comprehensive family management system
- Enhanced error handling and validation

### v1.0.0
- Initial API implementation
- Basic authentication and tourist management
- KYC verification system
- Incident reporting
- Admin dashboard features

---

*YatraId Backend - Securing Tourist Safety with Blockchain Technology*
