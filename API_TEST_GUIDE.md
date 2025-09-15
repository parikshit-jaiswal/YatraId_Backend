# YatraId Location API - Test Request Bodies

## 🧪 Complete API Testing Guide

This document provides ready-to-use request bodies for testing all location API endpoints using Postman, Thunder Client, or any HTTP client.

## 📋 Prerequisites

1. **Authentication**: All endpoints require JWT token in Authorization header
2. **Content-Type**: Set to `application/json` for POST/PUT requests
3. **Tourist Profile**: User must have a registered tourist profile with `touristId`
4. **Family Setup**: For family location features, users should be connected as family members

---

## 🔗 API Endpoints with Test Bodies

### 1. Update Current User's Location
**POST** `/api/locations/update`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Test Body 1 - Basic Location Update:**
```json
{
  "latitude": 25.5788,
  "longitude": 91.8933,
  "accuracy": 5.0,
  "isSharing": true,
  "shareWithFamily": true
}
```

**Test Body 2 - Complete Location Data:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 8.5,
  "altitude": 216.0,
  "heading": 45.2,
  "speed": 12.5,
  "isSharing": true,
  "shareWithFamily": true
}
```

**Test Body 3 - GPS Location (Moving Vehicle):**
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "accuracy": 3.2,
  "altitude": 14.0,
  "heading": 180.0,
  "speed": 25.8,
  "isSharing": true,
  "shareWithFamily": true
}
```

---

### 2. Get Family Members' Live Locations
**GET** `/api/locations/family`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**No Request Body Required**

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": [
    {
      "touristId": "TID-IND-2024-001235",
      "touristName": "John Doe",
      "profileImage": "https://example.com/profiles/john.jpg",
      "phoneNumber": "+91 9876543210",
      "location": {
        "latitude": 25.5790,
        "longitude": 91.8935,
        "accuracy": 8.0,
        "heading": 45.0,
        "timestamp": "2024-01-15T10:29:45.000Z"
      },
      "lastUpdated": "2024-01-15T10:29:45.000Z",
      "isInSafeZone": true,
      "marker": {
        "latitude": 25.5790,
        "longitude": 91.8935,
        "title": "John Doe",
        "subtitle": "Last seen: 10:29:45 AM",
        "accuracy": 8.0,
        "heading": 45.0
      }
    }
  ],
  "message": "Family locations retrieved successfully",
  "success": true
}
```

---

### 3. Get Specific Tourist's Location
**GET** `/api/locations/tourist/:touristId`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Test URLs:**
- `/api/locations/tourist/TID-IND-2024-001234`
- `/api/locations/tourist/TID-IND-2024-001235`

**No Request Body Required**

---

### 4. Get Real-time Location Updates (Polling)
**GET** `/api/locations/updates`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Test URLs:**
- `/api/locations/updates` (get all recent updates)
- `/api/locations/updates?since=2024-01-15T10:29:00.000Z` (updates since specific time)

**No Request Body Required**

---

### 5. Toggle Location Sharing
**POST** `/api/locations/toggle`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Test Body 1 - Enable Sharing:**
```json
{
  "isSharing": true,
  "shareWithFamily": true
}
```

**Test Body 2 - Disable Sharing:**
```json
{
  "isSharing": false,
  "shareWithFamily": false
}
```

**Test Body 3 - Share with Family Only:**
```json
{
  "isSharing": true,
  "shareWithFamily": true
}
```

---

### 6. Get Location Settings
**GET** `/api/locations/settings`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**No Request Body Required**

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "touristId": "TID-IND-2024-001234",
    "isSharing": true,
    "shareWithFamily": true,
    "updateInterval": 10,
    "movementThreshold": 25,
    "lastUpdated": "2024-01-15T10:30:00.000Z",
    "hasActiveLocation": true
  },
  "message": "Location settings retrieved successfully",
  "success": true
}
```

---

### 7. Update Location Settings
**PUT** `/api/locations/settings`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Test Body 1 - Update Polling Interval:**
```json
{
  "updateInterval": 15,
  "movementThreshold": 50,
  "shareWithFamily": true,
  "isSharing": true
}
```

**Test Body 2 - Battery Saving Mode:**
```json
{
  "updateInterval": 30,
  "movementThreshold": 100,
  "shareWithFamily": true,
  "isSharing": true
}
```

**Test Body 3 - High Accuracy Mode:**
```json
{
  "updateInterval": 5,
  "movementThreshold": 10,
  "shareWithFamily": true,
  "isSharing": true
}
```

---

### 8. Emergency SOS Location Broadcast
**POST** `/api/locations/emergency`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Test Body 1 - Basic Emergency:**
```json
{
  "latitude": 25.5788,
  "longitude": 91.8933,
  "accuracy": 5.0,
  "message": "Emergency SOS - Need immediate help!"
}
```

**Test Body 2 - Detailed Emergency:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 3.2,
  "altitude": 216.0,
  "message": "Medical emergency at Red Fort area"
}
```

**Test Body 3 - Road Accident:**
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "accuracy": 8.0,
  "message": "Road accident on Mumbai highway - need ambulance"
}
```

---

## 🧪 Postman Collection

### Environment Variables
Create these environment variables in Postman:

```
baseUrl: http://localhost:8000
authToken: <your-jwt-token>
touristId: <your-tourist-id>
```

### Collection Structure
```
YatraId Location API
├── Authentication
│   └── Login (to get JWT token)
├── Location Updates
│   ├── Update Location - Basic
│   ├── Update Location - Complete
│   └── Update Location - Moving
├── Family Locations
│   ├── Get Family Locations
│   ├── Get Tourist Location
│   └── Get Location Updates
├── Settings
│   ├── Toggle Location Sharing
│   ├── Get Location Settings
│   └── Update Location Settings
└── Emergency
    ├── Emergency SOS - Basic
    ├── Emergency SOS - Medical
    └── Emergency SOS - Accident
```

---

## 🔄 Testing Scenarios

### Scenario 1: Basic Location Sharing Setup
1. **Login** → Get JWT token
2. **Update Location** → Send initial location
3. **Toggle Sharing** → Enable location sharing
4. **Get Settings** → Verify sharing is enabled

### Scenario 2: Family Location Tracking
1. **Create Family** → Add family members (use family API)
2. **Update Location** → Multiple users send locations
3. **Get Family Locations** → See all family member locations
4. **Get Location Updates** → Poll for real-time updates

### Scenario 3: Emergency SOS Flow
1. **Update Location** → Normal location sharing
2. **Emergency SOS** → Send emergency broadcast
3. **Get Family Locations** → Verify emergency location is shared
4. **Get Location Updates** → Check emergency alerts

### Scenario 4: Battery Optimization Testing
1. **Update Settings** → Set high movement threshold (100m)
2. **Update Location** → Send location (lat: 25.5788, lng: 91.8933)
3. **Update Location** → Send nearby location (lat: 25.5789, lng: 91.8934) - should be ignored
4. **Update Location** → Send distant location (lat: 25.5900, lng: 91.9000) - should be processed

---

## 🐛 Error Testing

### Test Invalid Coordinates
```json
{
  "latitude": 95.0,
  "longitude": 200.0,
  "isSharing": true
}
```
**Expected**: 400 Bad Request

### Test Missing Authentication
Remove Authorization header
**Expected**: 401 Unauthorized

### Test Invalid Tourist ID
```
GET /api/locations/tourist/INVALID-ID
```
**Expected**: 404 Not Found

---

## 📱 Flutter Testing

### Quick Test Script for Flutter
```dart
// Test location update
final testLocation = {
  "latitude": 25.5788,
  "longitude": 91.8933,
  "accuracy": 5.0,
  "isSharing": true,
  "shareWithFamily": true
};

final response = await http.post(
  Uri.parse('${baseUrl}/api/locations/update'),
  headers: {
    'Authorization': 'Bearer $authToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode(testLocation),
);

print('Response: ${response.statusCode}');
print('Body: ${response.body}');
```

---

## 🔍 Verification Steps

### After Each API Call:
1. **Check Response Status**: Should be 200 for success
2. **Verify Response Structure**: Matches expected format
3. **Check Database**: Location data is properly stored
4. **Test Family Visibility**: Family members can see shared locations
5. **Verify Privacy**: Non-family members cannot access locations

### Performance Testing:
- Send rapid location updates (every 5 seconds for 5 minutes)
- Test with multiple family members simultaneously
- Verify polling efficiency with `/updates` endpoint

This comprehensive testing guide covers all scenarios for your location sharing API! 🚀