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

## 🔐 Authentication Endpoints

### 1. Combined Registration with KYC
Register a new user with tourist profile and KYC in one step.

**Endpoint:** `POST /auth/register-with-kyc`

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "phoneNumber": "+91-9876543210",
  "dateOfBirth": "1990-05-15",
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

**Response:**
```json
{
  "success": true,
  "message": "Registration initiated! OTP sent to your email. Your Tourist ID will be valid for 30 days from registration.",
  "email": "john.doe@example.com",
  "phoneNumber": "+91-9876543210",
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
      "validUntil": "2024-10-15T12:00:00.000Z"
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

## 👤 Tourist Management Endpoints

*All tourist endpoints require JWT authentication via Authorization header: `Bearer <token>`*

### 1. Register Tourist Profile
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
    "riskScore": 15
  }
}
```

### 3. Raise Panic/SOS Alert
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

### 4. Upload Profile Image
Upload profile picture for tourist.

**Endpoint:** `POST /tourists/profile-image`
**Content-Type:** `multipart/form-data`

**Form Data:**
- `profileImage`: Image file (max 10MB)

**Response:**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "imageUrl": "https://cloudinary_url/profile_image.jpg"
}
```

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

### 5. Search Tourist for Family
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

### 4. Get KYC Status
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
    "verifiedAt": "2024-03-15T10:30:00.000Z"
  }
}
```

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

## 🔧 Admin Endpoints

*All admin endpoints require JWT authentication and admin privileges*

### 1. Get All Tourists
Get list of all registered tourists (Admin only).

**Endpoint:** `GET /tourists`

### 2. Tourist Analytics
Get comprehensive analytics for tourists (Admin only).

**Endpoint:** `GET /tourists/admin/analytics`

### 3. SOS Alerts Monitoring
Monitor all SOS alerts in real-time (Admin only).

**Endpoint:** `GET /tourists/admin/sos-alerts`

### 4. Heat Map Data
Get location-based heat map data for tourist activities (Admin only).

**Endpoint:** `GET /tourists/admin/heatmap`

### 5. Create Restricted Zone
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

## 🔑 Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

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

## 🚨 Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Data Encryption**: Sensitive data encrypted before IPFS storage
- **Blockchain Security**: Immutable evidence storage on blockchain
- **Input Validation**: Comprehensive request validation
- **CORS Protection**: Configured CORS for secure cross-origin requests

## 🌐 Environment Variables

Create a `.env` file with the following variables:

```env
PORT=8080
MONGODB_URI=mongodb://localhost:27017/yatraId
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

## 🚀 Getting Started

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
Create a `.env` file with required variables (see above)

4. **Start the development server**
```bash
npm run dev
```

5. **Build for production**
```bash
npm run build
npm start
```

## 📞 Support

For any questions or issues, please contact the development team or create an issue in the repository.

---

*YatraId Backend - Securing Tourist Safety with Blockchain Technology*
