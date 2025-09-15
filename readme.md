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

## 📚 API Endpoints

### Base URL
```
http://localhost:8080/api
```

### Headers Required for Protected Routes
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

---

## 🔐 Authentication Endpoints

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
