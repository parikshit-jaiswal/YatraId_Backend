# 🚀 Postman Testing Guide for YatraId Location APIs

## 📋 Setup Instructions

### 1. **Create New Collection in Postman**
- Name: `YatraId Location APIs`
- Base URL: `http://localhost:8000` (or your server URL)

### 2. **Set Environment Variables**
Create these variables in Postman Environment:
```
baseUrl: http://localhost:8000
authToken: (will be set after login)
touristId: (will be set after getting tourist profile)
```

### 3. **Authentication Setup**
All location APIs require JWT token. First, get your auth token:

---

## 🔐 Step 1: Authentication (Get JWT Token)

### **POST** `{{baseUrl}}/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "user": {
      "_id": "60d5ecb74b24a7001f8d4321",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User logged in successfully",
  "success": true
}
```

**⚠️ Important:** Copy the `accessToken` and set it as `authToken` in your environment variables.

---

## 🏠 Step 2: Get Tourist Profile (Get Tourist ID)

### **GET** `{{baseUrl}}/api/tourists/dashboard`

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "tourist": {
      "touristId": "TID-IND-2024-001234",
      "fullName": "John Doe",
      "phoneNumber": "+91 9876543210"
    }
  }
}
```

**⚠️ Important:** Copy the `touristId` and set it in your environment variables.

---

## 📍 Step 3: Location API Tests

### **Test 1: Update Location**
### **POST** `{{baseUrl}}/api/locations/update`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Test Body 1 - Basic Location:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 5.0,
  "isSharing": true,
  "shareWithFamily": true
}
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "touristId": "TID-IND-2024-001234",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "accuracy": 5.0,
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    "isSharing": true,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "message": "Location updated successfully",
  "success": true
}
```

**Test Body 2 - Complete Location Data:**
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

**Test Body 3 - Different City (Bangalore):**
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 8.0,
  "altitude": 920.0,
  "heading": 90.0,
  "speed": 0.0,
  "isSharing": true,
  "shareWithFamily": true
}
```

---

### **Test 2: Get Location Settings**
### **GET** `{{baseUrl}}/api/locations/settings`

**Headers:**
```
Authorization: Bearer {{authToken}}
```

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

### **Test 3: Toggle Location Sharing**
### **POST** `{{baseUrl}}/api/locations/toggle`

**Headers:**
```
Authorization: Bearer {{authToken}}
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

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "touristId": "TID-IND-2024-001234",
    "isSharing": true,
    "shareWithFamily": true
  },
  "message": "Location sharing settings updated",
  "success": true
}
```

---

### **Test 4: Update Location Settings**
### **PUT** `{{baseUrl}}/api/locations/settings`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Test Body 1 - Battery Saving Mode:**
```json
{
  "updateInterval": 30,
  "movementThreshold": 100,
  "shareWithFamily": true,
  "isSharing": true
}
```

**Test Body 2 - High Accuracy Mode:**
```json
{
  "updateInterval": 5,
  "movementThreshold": 10,
  "shareWithFamily": true,
  "isSharing": true
}
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "touristId": "TID-IND-2024-001234",
    "isSharing": true,
    "shareWithFamily": true,
    "updateInterval": 30,
    "movementThreshold": 100,
    "lastUpdated": "2024-01-15T10:35:00.000Z"
  },
  "message": "Location settings updated successfully",
  "success": true
}
```

---

### **Test 5: Get Family Locations**
### **GET** `{{baseUrl}}/api/locations/family`

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Expected Response (if family members are sharing):**
```json
{
  "statusCode": 200,
  "data": [
    {
      "touristId": "TID-IND-2024-001235",
      "touristName": "Jane Smith",
      "profileImage": null,
      "phoneNumber": "+91 9876543211",
      "location": {
        "latitude": 28.6200,
        "longitude": 77.2100,
        "accuracy": 6.0,
        "heading": 45.0,
        "timestamp": "2024-01-15T10:28:00.000Z"
      },
      "lastUpdated": "2024-01-15T10:28:00.000Z",
      "isInSafeZone": true,
      "marker": {
        "latitude": 28.6200,
        "longitude": 77.2100,
        "title": "Jane Smith",
        "subtitle": "Last seen: 10:28:00 AM",
        "accuracy": 6.0,
        "heading": 45.0
      }
    }
  ],
  "message": "Family locations retrieved successfully",
  "success": true
}
```

**Expected Response (if no family members):**
```json
{
  "statusCode": 200,
  "data": [],
  "message": "No family members found",
  "success": true
}
```

---

### **Test 6: Get Specific Tourist Location**
### **GET** `{{baseUrl}}/api/locations/tourist/{{touristId}}`

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "touristId": "TID-IND-2024-001234",
    "touristName": "John Doe",
    "profileImage": null,
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "accuracy": 5.0,
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    "lastUpdated": "2024-01-15T10:30:00.000Z",
    "isInSafeZone": false,
    "locationHistory": [
      {
        "latitude": 28.6100,
        "longitude": 77.2050,
        "timestamp": "2024-01-15T10:25:00.000Z"
      }
    ],
    "marker": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "title": "John Doe",
      "subtitle": "Last seen: 10:30:00 AM",
      "accuracy": 5.0
    }
  },
  "message": "Tourist location retrieved successfully",
  "success": true
}
```

---

### **Test 7: Get Location Updates (Polling)**
### **GET** `{{baseUrl}}/api/locations/updates`

**Headers:**
```
Authorization: Bearer {{authToken}}
```

**Test URLs:**
1. `{{baseUrl}}/api/locations/updates` (all recent updates)
2. `{{baseUrl}}/api/locations/updates?since=2024-01-15T10:29:00.000Z` (updates since specific time)

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "updates": [
      {
        "touristId": "TID-IND-2024-001235",
        "lat": 28.6200,
        "lng": 77.2100,
        "timestamp": "2024-01-15T10:30:15.000Z",
        "accuracy": 6.0,
        "heading": 45.0
      }
    ],
    "hasUpdates": true,
    "lastChecked": "2024-01-15T10:30:20.000Z",
    "nextPollIn": 10
  },
  "message": "Location updates available",
  "success": true
}
```

---

### **Test 8: Emergency SOS Location Broadcast**
### **POST** `{{baseUrl}}/api/locations/emergency`

**Headers:**
```
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

**Test Body 1 - Basic Emergency:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 5.0,
  "message": "Emergency SOS - Need immediate help!"
}
```

**Test Body 2 - Medical Emergency:**
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "accuracy": 3.0,
  "message": "Medical emergency - heart attack symptoms"
}
```

**Test Body 3 - Road Accident:**
```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 8.0,
  "message": "Road accident on Bangalore highway - ambulance needed"
}
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "data": {
    "touristId": "TID-IND-2024-001234",
    "emergencyLocation": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "accuracy": 5.0,
      "timestamp": "2024-01-15T10:35:00.000Z"
    },
    "message": "Emergency SOS - Need immediate help!",
    "broadcastTime": "2024-01-15T10:35:00.000Z"
  },
  "message": "Emergency location broadcasted to family members",
  "success": true
}
```

---

## ❌ Error Testing

### **Test Invalid Coordinates:**
```json
{
  "latitude": 95.0,
  "longitude": 200.0,
  "isSharing": true
}
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "message": "Invalid latitude value",
  "success": false
}
```

### **Test Missing Authentication:**
Remove Authorization header from any request.

**Expected Response:**
```json
{
  "statusCode": 401,
  "message": "Access token is required",
  "success": false
}
```

### **Test Invalid Tourist ID:**
`GET {{baseUrl}}/api/locations/tourist/INVALID-ID`

**Expected Response:**
```json
{
  "statusCode": 403,
  "message": "You don't have permission to view this location",
  "success": false
}
```

---

## 🔄 Testing Flow Sequence

### **Complete Test Sequence:**
1. ✅ **Login** → Get JWT token
2. ✅ **Get Dashboard** → Get tourist ID
3. ✅ **Update Location** → Send initial location
4. ✅ **Get Settings** → Verify location settings
5. ✅ **Toggle Sharing** → Enable sharing
6. ✅ **Update Settings** → Customize preferences
7. ✅ **Get Family Locations** → Check family locations
8. ✅ **Get Updates** → Test polling endpoint
9. ✅ **Emergency SOS** → Test emergency broadcast

### **Multi-User Testing:**
1. Create multiple user accounts
2. Set up family relationships
3. Have different users update locations
4. Test family location visibility
5. Test emergency SOS notifications

---

## 📊 Testing Checklist

### ✅ **Successful Tests Should Show:**
- [ ] Status Code: 200
- [ ] Response has correct structure
- [ ] Location data is properly formatted
- [ ] Timestamps are in ISO format
- [ ] Family members can see shared locations
- [ ] Privacy is maintained (non-family can't see locations)

### ⚠️ **Common Issues & Solutions:**
- **401 Error**: Check if JWT token is valid and properly set
- **404 Error**: Ensure tourist profile exists and touristId is correct
- **403 Error**: Verify family relationships are established
- **400 Error**: Check request body format and coordinate values

---

## 🎯 Pro Tips for Testing

1. **Use Postman Scripts:**
   ```javascript
   // Set auth token automatically after login
   pm.test("Set auth token", function () {
       var jsonData = pm.response.json();
       pm.environment.set("authToken", jsonData.data.accessToken);
   });
   ```

2. **Test Real Coordinates:**
   - Delhi: `28.6139, 77.2090`
   - Mumbai: `19.0760, 72.8777`
   - Bangalore: `12.9716, 77.5946`
   - Shillong: `25.5788, 91.8933`

3. **Performance Testing:**
   - Send location updates every 5-10 seconds
   - Test with multiple family members
   - Monitor response times

Your location sharing API is now ready for comprehensive testing! 🚀