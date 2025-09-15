# YatraId Backend API Documentation

## Overview
YatraId is a comprehensive tourist safety and management system with blockchain integration, family management, incident reporting, and KYC verification capabilities.

**Base URL:** `http://localhost:3005`
**Environment:** Development

## Table of Contents
- [Authentication](#authentication)
- [Tourist Management](#tourist-management)
- [Family Management](#family-management)
- [KYC Verification](#kyc-verification)
- [Incident Reporting](#incident-reporting)
- [Admin Features](#admin-features)

## Authentication

### Register User
**POST** `/api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully. Please check your email."
}
```

### Verify Registration OTP
**POST** `/api/auth/verify-otp`

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
  "message": "User registered successfully",
  "user": {
    "id": "66f1a2b3c4d5e6f7g8h9i0j1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "walletAddress": "0x742d35Cc6534C0532925a3b8D0C9d3F3b5f8e9F0"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "66f1a2b3c4d5e6f7g8h9i0j1",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "walletAddress": "0x742d35Cc6534C0532925a3b8D0C9d3F3b5f8e9F0"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Google Login
**POST** `/api/auth/google-login`

**Request Body:**
```json
{
  "tokenId": "google_oauth_token_here"
}
```

---

## Tourist Management

**Authentication Required:** Bearer Token

### Register Tourist Profile
**POST** `/api/tourists/register`

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
      "phone": "+91-9876543211",
      "email": "jane.doe@example.com"
    }
  ],
  "validUntil": 1735689600,
  "trackingOptIn": true,
  "ownerWallet": "0x742d35Cc6534C0532925a3b8D0C9d3F3b5f8e9F0"
}
```

**Response:**
```json
{
  "success": true,
  "touristId": "66f1a2b3c4d5e6f7g8h9i0j1",
  "touristIdOnChain": "0x8f7e6d5c4b3a29180716253849576038495a6b7c",
  "validUntil": 1735693200,
  "onchainStatus": "pending",
  "kycStatus": "pending",
  "isActive": false,
  "message": "Tourist profile created successfully. Please complete KYC verification to activate your digital tourist ID."
}
```

### Get Tourist Dashboard
**GET** `/api/tourists/dashboard`

**Response:**
```json
{
  "success": true,
  "user": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "walletAddress": "0x742d35Cc6534C0532925a3b8D0C9d3F3b5f8e9F0",
    "kycStatus": "verified",
    "kycType": "indian"
  },
  "tourist": {
    "id": "66f1a2b3c4d5e6f7g8h9i0j1",
    "touristIdOnChain": "0x8f7e6d5c4b3a29180716253849576038495a6b7c",
    "nationality": "indian",
    "validUntil": "2024-12-31T18:30:00.000Z",
    "trackingOptIn": true,
    "kycStatus": "verified",
    "onchainStatus": "active",
    "isRegisteredOnChain": true,
    "canUseBlockchain": true,
    "panicCount": 0,
    "activePanics": 0,
    "createdAt": "2025-09-15T10:30:00.000Z"
  },
  "hasProfile": true,
  "message": "Profile fully active and registered on blockchain."
}
```

### Get Tourist Details
**GET** `/api/tourists/{id}?decrypt=true`

**Response:**
```json
{
  "id": "66f1a2b3c4d5e6f7g8h9i0j1",
  "touristIdOnChain": "0x8f7e6d5c4b3a29180716253849576038495a6b7c",
  "ownerWallet": "0x742d35Cc6534C0532925a3b8D0C9d3F3b5f8e9F0",
  "validUntil": "2024-12-31T18:30:00.000Z",
  "trackingOptIn": true,
  "kycData": {
    "fullName": "John Doe",
    "phoneNumber": "+91-9876543210",
    "dateOfBirth": "1990-05-15T00:00:00.000Z"
  },
  "emergencyContacts": [
    {
      "name": "Jane Doe",
      "relationship": "spouse",
      "phone": "+91-9876543211"
    }
  ],
  "onchainStatus": "confirmed"
}
```

### Raise Panic/SOS
**POST** `/api/tourists/{id}/panic`

**Request Body:**
```json
{
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "Connaught Place, New Delhi, Delhi 110001, India"
  },
  "evidence": {
    "photos": ["base64_image_data"],
    "audio": "base64_audio_data",
    "notes": "Emergency situation - need immediate help"
  },
  "description": "Being followed by unknown person. Feel unsafe."
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

### Upload Profile Image
**POST** `/api/tourists/profile-image`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `profileImage`: Image file (JPEG/PNG)

**Response:**
```json
{
  "success": true,
  "data": {
    "profileImage": "https://cloudinary.com/image/upload/v1234567890/profile.jpg"
  },
  "message": "Profile picture updated successfully"
}
```

---

## Family Management

**Authentication Required:** Bearer Token

### Create Family Group
**POST** `/api/family/create`

**Request Body:**
```json
{
  "familyName": "The Sharma Family",
  "shareLocation": true,
  "emergencyNotifications": true
}
```

**Response:**
```json
{
  "statusCode": 201,
  "message": "Family group created successfully",
  "data": {
    "primaryTouristId": "TID-IND-2024-001234",
    "primaryUserId": "66f1a2b3c4d5e6f7g8h9i0j1",
    "familyName": "The Sharma Family",
    "shareLocation": true,
    "emergencyNotifications": true,
    "members": [],
    "createdAt": "2025-09-15T10:30:00.000Z"
  }
}
```

### Get Family Details
**GET** `/api/family/`

**Response:**
```json
{
  "statusCode": 200,
  "message": "Family details retrieved successfully",
  "data": {
    "primaryTouristId": "TID-IND-2024-001234",
    "familyName": "The Sharma Family",
    "shareLocation": true,
    "emergencyNotifications": true,
    "members": [
      {
        "touristId": "TID-IND-2024-001235",
        "fullName": "Priya Sharma",
        "relationship": "spouse",
        "phoneNumber": "+91-9876543210",
        "emergencyContact": true,
        "addedAt": "2025-09-15T10:35:00.000Z"
      }
    ]
  }
}
```

### Add Family Member
**POST** `/api/family/members`

**Request Body:**
```json
{
  "touristId": "TID-IND-2024-001235",
  "relationship": "spouse",
  "emergencyContact": true
}
```

**Response:**
```json
{
  "statusCode": 200,
  "message": "Family member added successfully",
  "data": {
    "primaryTouristId": "TID-IND-2024-001234",
    "members": [
      {
        "touristId": "TID-IND-2024-001235",
        "fullName": "Priya Sharma",
        "relationship": "spouse",
        "phoneNumber": "+91-9876543210",
        "emergencyContact": true,
        "addedAt": "2025-09-15T10:35:00.000Z"
      }
    ]
  }
}
```

### Remove Family Member
**DELETE** `/api/family/members/{touristId}`

**Response:**
```json
{
  "statusCode": 200,
  "message": "Family member removed successfully",
  "data": {
    "primaryTouristId": "TID-IND-2024-001234",
    "members": []
  }
}
```

### Search Tourist for Family
**GET** `/api/family/search/{touristId}`

**Response:**
```json
{
  "statusCode": 200,
  "message": "Tourist found",
  "data": {
    "touristId": "TID-IND-2024-001235",
    "fullName": "Priya Sharma",
    "phoneNumber": "+91-9876543210",
    "nationality": "indian",
    "isActive": true
  }
}
```

---

## KYC Verification

**Authentication Required:** Bearer Token

### Initiate Indian KYC
**POST** `/api/kyc/indian/initiate`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "phoneNumber": "+91-9876543210",
  "dateOfBirth": "1990-05-15",
  "address": "123 Main Street, New Delhi, 110001",
  "aadhaarNumber": "1234-5678-9012"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your registered mobile number",
  "sessionId": "session_abc123",
  "phoneNumber": "+91-9876543210"
}
```

### Verify Indian KYC OTP
**POST** `/api/kyc/indian/verify-otp`

**Request Body:**
```json
{
  "otp": "123456",
  "sessionId": "session_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "KYC verification completed successfully",
  "tourist": {
    "touristId": "TID-IND-2024-001234",
    "kycStatus": "verified",
    "nationality": "indian",
    "isActive": true
  }
}
```

### Initiate International KYC
**POST** `/api/kyc/international/initiate`

**Request Body:**
```json
{
  "fullName": "John Smith",
  "phoneNumber": "+1-234-567-8900",
  "dateOfBirth": "1985-03-20",
  "nationality": "US",
  "passportNumber": "AB1234567",
  "passportExpiryDate": "2030-03-20",
  "address": "456 Broadway, New York, NY 10001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to your email for verification",
  "sessionId": "session_xyz789"
}
```

### Get KYC Status
**GET** `/api/kyc/status`

**Response:**
```json
{
  "success": true,
  "kycStatus": {
    "status": "verified",
    "method": "digilocker",
    "nationality": "indian",
    "touristId": "TID-IND-2024-001234",
    "verifiedAt": "2025-09-15T10:30:00.000Z"
  }
}
```

---

## Incident Reporting

**Authentication Required:** Bearer Token

### Report Incident
**POST** `/api/incidents/report`

**Request Body:**
```json
{
  "touristId": "66f1a2b3c4d5e6f7g8h9i0j1",
  "type": "theft",
  "severity": "high",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "Connaught Place, New Delhi",
    "landmark": "Central Park"
  },
  "dateTime": "2025-09-15T14:30:00.000Z",
  "description": "Mobile phone stolen while walking in the market area",
  "witnesses": [
    {
      "name": "Witness Name",
      "contact": "+91-9876543212"
    }
  ],
  "reportedBy": "self",
  "evidenceFiles": ["base64_image_evidence"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Incident reported successfully",
  "incident": {
    "incidentId": "INC-2025-000001",
    "status": "reported",
    "firNumber": null,
    "assignedOfficer": null,
    "createdAt": "2025-09-15T14:35:00.000Z"
  }
}
```

### Get Incident Details
**GET** `/api/incidents/{incidentId}`

**Response:**
```json
{
  "success": true,
  "incident": {
    "incidentId": "INC-2025-000001",
    "type": "theft",
    "severity": "high",
    "status": "under_investigation",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "address": "Connaught Place, New Delhi"
    },
    "description": "Mobile phone stolen while walking in the market area",
    "firNumber": "FIR-DEL-2025-001234",
    "assignedOfficer": "Inspector Sharma",
    "createdAt": "2025-09-15T14:35:00.000Z",
    "updatedAt": "2025-09-15T15:00:00.000Z"
  }
}
```

---

## Admin Features

**Authentication Required:** Bearer Token + Admin Role

### Get All Tourists
**GET** `/api/tourists/?page=1&limit=20`

**Response:**
```json
{
  "tourists": [
    {
      "id": "66f1a2b3c4d5e6f7g8h9i0j1",
      "fullName": "John Doe",
      "phoneNumber": "+91-9876543210",
      "nationality": "indian",
      "kycStatus": "verified",
      "isActive": true,
      "panicCount": 0,
      "createdAt": "2025-09-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  },
  "summary": {
    "total": 1,
    "active": 1,
    "withPanics": 0
  }
}
```

### Search Tourist
**GET** `/api/tourists/admin/search?query=TID-IND-2024-001234&searchType=touristId`

**Response:**
```json
{
  "success": true,
  "tourist": {
    "id": "66f1a2b3c4d5e6f7g8h9i0j1",
    "touristId": "TID-IND-2024-001234",
    "fullName": "John Doe",
    "phoneNumber": "+91-9876543210",
    "nationality": "indian",
    "kycStatus": "verified",
    "isActive": true,
    "panicCount": 0,
    "hasActivePanics": false,
    "lastSeen": "2025-09-15T16:30:00.000Z"
  }
}
```

### Get SOS Alerts
**GET** `/api/tourists/admin/sos-alerts?status=active&priority=high`

**Response:**
```json
{
  "success": true,
  "sosAlerts": [
    {
      "touristId": "TID-IND-2024-001234",
      "fullName": "John Doe",
      "phoneNumber": "+91-9876543210",
      "panic": {
        "location": {
          "latitude": 28.6139,
          "longitude": 77.2090
        },
        "timestamp": "2025-09-15T16:30:00.000Z",
        "onchainStatus": "pending"
      },
      "priority": "high",
      "hoursAgo": 0.5,
      "needsAttention": true
    }
  ],
  "summary": {
    "total": 1,
    "high": 1,
    "medium": 0,
    "low": 0,
    "needingAttention": 1
  }
}
```

### Create Restricted Zone
**POST** `/api/tourists/admin/restricted-zones`

**Request Body:**
```json
{
  "name": "High Risk Area - Downtown",
  "description": "Area with increased criminal activity",
  "coordinates": [
    { "lat": 28.6139, "lng": 77.2090 },
    { "lat": 28.6140, "lng": 77.2091 },
    { "lat": 28.6141, "lng": 77.2092 }
  ],
  "severity": "high",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "zone": {
    "id": "66f1a2b3c4d5e6f7g8h9i0j1",
    "name": "High Risk Area - Downtown",
    "description": "Area with increased criminal activity",
    "coordinates": [
      { "lat": 28.6139, "lng": 77.2090 },
      { "lat": 28.6140, "lng": 77.2091 }
    ],
    "severity": "high",
    "isActive": true,
    "createdAt": "2025-09-15T16:30:00.000Z"
  },
  "message": "Restricted zone created successfully"
}
```

### Get Tourist Analytics
**GET** `/api/tourists/admin/analytics?period=7d`

**Response:**
```json
{
  "success": true,
  "analytics": {
    "period": "7d",
    "dateRange": {
      "startDate": "2025-09-08T16:30:00.000Z",
      "endDate": "2025-09-15T16:30:00.000Z"
    },
    "totalStats": {
      "totalTourists": 150,
      "activeTourists": 120,
      "verifiedTourists": 110,
      "trackingOptIns": 90
    },
    "registrationTrend": [
      { "_id": "2025-09-14", "count": 5 },
      { "_id": "2025-09-15", "count": 8 }
    ],
    "kycStats": [
      { "_id": "verified", "count": 110 },
      { "_id": "pending", "count": 30 },
      { "_id": "failed", "count": 10 }
    ],
    "panicStats": {
      "totalPanics": 15,
      "recentPanics": 3,
      "touristsWithPanics": 12
    }
  }
}
```

## Error Responses

### Validation Error (400)
```json
{
  "error": "Missing required fields: fullName, phoneNumber, emergencyContacts"
}
```

### Authentication Error (401)
```json
{
  "error": "Unauthorized request"
}
```

### Authorization Error (403)
```json
{
  "error": "Access denied"
}
```

### Not Found (404)
```json
{
  "error": "Tourist not found"
}
```

### Server Error (500)
```json
{
  "error": "Internal server error",
  "details": "Error message (development only)"
}
```

## Authentication Headers

For all protected endpoints, include the JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Relationship Types (Family Management)
- `parent`
- `spouse`
- `child`
- `sibling`
- `guardian`
- `other`

## Incident Types
- `theft`
- `assault`
- `harassment`
- `fraud`
- `lost_documents`
- `medical_emergency`
- `natural_disaster`
- `other`

## Severity Levels
- `low`
- `medium`
- `high`
- `critical`

## Environment Variables Required

```env
MONGODB_URI=mongodb://localhost:27017/tourist_safety
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

## Status Codes Summary

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

For more details or support, contact the development team.
