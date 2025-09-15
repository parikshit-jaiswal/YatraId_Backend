# YatraId Live Location Sharing API

## Overview
This document provides comprehensive documentation for implementing live location sharing using HTTP polling for family members in the YatraId system. Perfect for hackathon prototypes before implementing WebSocket solutions.

## 🚀 Quick Start

### Backend Setup
The location sharing system is already integrated into your existing YatraId backend. All endpoints require JWT authentication.

### Flutter Integration
Here's how to implement polling-based live location sharing in your Flutter app:

## 📍 API Endpoints

### 1. Update Current User's Location
**POST** `/api/locations/update`

Updates the current user's live location for family sharing.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "latitude": 25.5788,
  "longitude": 91.8933,
  "accuracy": 5.0,
  "altitude": 1520.0,
  "heading": 90.5,
  "speed": 15.2,
  "isSharing": true,
  "shareWithFamily": true
}
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "touristId": "TID-IND-2024-001234",
    "location": {
      "latitude": 25.5788,
      "longitude": 91.8933,
      "accuracy": 5.0,
      "altitude": 1520.0,
      "heading": 90.5,
      "speed": 15.2,
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    "isSharing": true,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "message": "Location updated successfully",
  "success": true
}
```

### 2. Get Family Members' Live Locations
**GET** `/api/locations/family`

Retrieves live locations of all family members who are sharing their location.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
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

### 3. Get Real-time Location Updates (for Polling)
**GET** `/api/locations/updates?since=2024-01-15T10:29:00.000Z`

Optimized endpoint for frequent polling to get only recent location updates.

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "updates": [
      {
        "touristId": "TID-IND-2024-001235",
        "lat": 25.5792,
        "lng": 91.8937,
        "timestamp": "2024-01-15T10:30:15.000Z",
        "accuracy": 6.0,
        "heading": 50.0
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

### 4. Toggle Location Sharing
**POST** `/api/locations/toggle`

**Request Body:**
```json
{
  "isSharing": true,
  "shareWithFamily": true
}
```

### 5. Get Location Settings
**GET** `/api/locations/settings`

**Response:**
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

### 6. Emergency SOS Location Broadcast
**POST** `/api/locations/emergency`

**Request Body:**
```json
{
  "latitude": 25.5788,
  "longitude": 91.8933,
  "accuracy": 5.0,
  "message": "Emergency situation - need help!"
}
```

## 🔧 Flutter Implementation

### 1. Location Service Class

```dart
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocationService {
  static const String baseUrl = 'https://your-api-domain.com/api/locations';
  Timer? _locationUpdateTimer;
  Timer? _familyLocationTimer;
  
  String? _authToken;
  bool _isSharing = false;
  Position? _lastPosition;
  
  // Polling intervals
  static const int locationUpdateInterval = 10; // seconds
  static const int familyLocationPollInterval = 10; // seconds
  static const double movementThreshold = 25.0; // meters

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString('auth_token');
    _isSharing = prefs.getBool('location_sharing') ?? false;
    
    if (_isSharing) {
      await startLocationSharing();
    }
  }

  Future<void> startLocationSharing() async {
    if (_authToken == null) return;
    
    _isSharing = true;
    
    // Start periodic location updates
    _locationUpdateTimer = Timer.periodic(
      Duration(seconds: locationUpdateInterval),
      (_) => _updateCurrentLocation(),
    );
    
    // Start polling for family locations
    _familyLocationTimer = Timer.periodic(
      Duration(seconds: familyLocationPollInterval),
      (_) => getFamilyLocations(),
    );
    
    // Save preference
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('location_sharing', true);
  }

  Future<void> stopLocationSharing() async {
    _isSharing = false;
    _locationUpdateTimer?.cancel();
    _familyLocationTimer?.cancel();
    
    // Turn off sharing on server
    await toggleLocationSharing(false);
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('location_sharing', false);
  }

  Future<void> _updateCurrentLocation() async {
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      // Check if user has moved significantly
      if (_lastPosition != null) {
        final distance = Geolocator.distanceBetween(
          _lastPosition!.latitude,
          _lastPosition!.longitude,
          position.latitude,
          position.longitude,
        );
        
        if (distance < movementThreshold) {
          return; // Don't update if user hasn't moved much
        }
      }
      
      _lastPosition = position;
      await _sendLocationUpdate(position);
      
    } catch (e) {
      print('Error updating location: $e');
    }
  }

  Future<void> _sendLocationUpdate(Position position) async {
    if (_authToken == null) return;
    
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/update'),
        headers: {
          'Authorization': 'Bearer $_authToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'altitude': position.altitude,
          'heading': position.heading,
          'speed': position.speed,
          'isSharing': true,
          'shareWithFamily': true,
        }),
      );
      
      if (response.statusCode == 200) {
        print('Location updated successfully');
      }
    } catch (e) {
      print('Error sending location update: $e');
    }
  }

  Future<List<FamilyLocation>> getFamilyLocations() async {
    if (_authToken == null) return [];
    
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/family'),
        headers: {'Authorization': 'Bearer $_authToken'},
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List locations = data['data'] ?? [];
        return locations.map((loc) => FamilyLocation.fromJson(loc)).toList();
      }
    } catch (e) {
      print('Error getting family locations: $e');
    }
    
    return [];
  }

  Future<void> toggleLocationSharing(bool isSharing) async {
    if (_authToken == null) return;
    
    try {
      await http.post(
        Uri.parse('$baseUrl/toggle'),
        headers: {
          'Authorization': 'Bearer $_authToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'isSharing': isSharing,
          'shareWithFamily': true,
        }),
      );
    } catch (e) {
      print('Error toggling location sharing: $e');
    }
  }

  Future<void> sendEmergencyLocation() async {
    if (_authToken == null) return;
    
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      await http.post(
        Uri.parse('$baseUrl/emergency'),
        headers: {
          'Authorization': 'Bearer $_authToken',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'message': 'Emergency SOS - Need immediate help!',
        }),
      );
    } catch (e) {
      print('Error sending emergency location: $e');
    }
  }
}

class FamilyLocation {
  final String touristId;
  final String touristName;
  final String? profileImage;
  final String? phoneNumber;
  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? heading;
  final DateTime lastUpdated;
  final bool isInSafeZone;

  FamilyLocation({
    required this.touristId,
    required this.touristName,
    this.profileImage,
    this.phoneNumber,
    required this.latitude,
    required this.longitude,
    this.accuracy,
    this.heading,
    required this.lastUpdated,
    required this.isInSafeZone,
  });

  factory FamilyLocation.fromJson(Map<String, dynamic> json) {
    return FamilyLocation(
      touristId: json['touristId'],
      touristName: json['touristName'],
      profileImage: json['profileImage'],
      phoneNumber: json['phoneNumber'],
      latitude: json['location']['latitude'].toDouble(),
      longitude: json['location']['longitude'].toDouble(),
      accuracy: json['location']['accuracy']?.toDouble(),
      heading: json['location']['heading']?.toDouble(),
      lastUpdated: DateTime.parse(json['lastUpdated']),
      isInSafeZone: json['isInSafeZone'] ?? false,
    );
  }
}
```

### 2. Google Maps Integration

```dart
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class FamilyMapScreen extends StatefulWidget {
  @override
  _FamilyMapScreenState createState() => _FamilyMapScreenState();
}

class _FamilyMapScreenState extends State<FamilyMapScreen> {
  GoogleMapController? mapController;
  LocationService locationService = LocationService();
  Set<Marker> markers = {};
  bool isMapInitialized = false;
  
  @override
  void initState() {
    super.initState();
    locationService.initialize();
    _startLocationUpdates();
  }

  void _startLocationUpdates() {
    Timer.periodic(Duration(seconds: 10), (timer) async {
      final familyLocations = await locationService.getFamilyLocations();
      _updateMarkers(familyLocations);
    });
  }

  void _updateMarkers(List<FamilyLocation> locations) {
    final newMarkers = <Marker>{};
    
    for (final location in locations) {
      newMarkers.add(
        Marker(
          markerId: MarkerId(location.touristId),
          position: LatLng(location.latitude, location.longitude),
          infoWindow: InfoWindow(
            title: location.touristName,
            snippet: 'Last seen: ${_formatTime(location.lastUpdated)}',
          ),
          icon: location.isInSafeZone 
            ? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen)
            : BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        ),
      );
    }
    
    if (mounted) {
      setState(() {
        markers = newMarkers;
      });
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);
    
    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else {
      return '${difference.inHours}h ago';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Family Location'),
        actions: [
          IconButton(
            icon: Icon(Icons.my_location),
            onPressed: _recenterMap,
          ),
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: () async {
              final locations = await locationService.getFamilyLocations();
              _updateMarkers(locations);
            },
          ),
        ],
      ),
      body: GoogleMap(
        initialCameraPosition: const CameraPosition(
          target: LatLng(25.5788, 91.8933), // Shillong
          zoom: 6.5,
        ),
        onMapCreated: (GoogleMapController controller) {
          mapController = controller;
          setState(() {
            isMapInitialized = true;
          });
        },
        markers: markers,
        myLocationEnabled: true,
        myLocationButtonEnabled: false,
        zoomControlsEnabled: false,
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            heroTag: "emergency",
            onPressed: () async {
              await locationService.sendEmergencyLocation();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Emergency location sent to family')),
              );
            },
            backgroundColor: Colors.red,
            child: Icon(Icons.emergency),
          ),
          SizedBox(height: 16),
          FloatingActionButton(
            heroTag: "share",
            onPressed: () async {
              await locationService.startLocationSharing();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Started sharing location')),
              );
            },
            child: Icon(Icons.share_location),
          ),
        ],
      ),
    );
  }

  void _recenterMap() async {
    if (mapController != null && isMapInitialized) {
      try {
        final position = await Geolocator.getCurrentPosition();
        mapController!.animateCamera(
          CameraUpdate.newLatLng(
            LatLng(position.latitude, position.longitude),
          ),
        );
      } catch (e) {
        print('Error recentering map: $e');
      }
    }
  }

  @override
  void dispose() {
    locationService.stopLocationSharing();
    super.dispose();
  }
}
```

## 🔧 Configuration Options

### Location Update Settings
You can customize these parameters:

- **Update Interval**: 5-60 seconds (default: 10 seconds)
- **Movement Threshold**: 10-1000 meters (default: 25 meters)
- **Polling Frequency**: How often to check for family updates (default: 10 seconds)

### Battery Optimization
- Only update when app is in foreground
- Only send updates when user has moved significantly
- Use efficient API endpoint for polling

### Privacy Controls
- Family members can toggle sharing on/off
- Emergency mode forces sharing temporarily
- Location history is limited to last 10 positions

## 🚨 Error Handling

### Common HTTP Status Codes
- **400**: Invalid coordinates or missing required fields
- **401**: Invalid or expired JWT token
- **403**: No permission to view location (not family member)
- **404**: Tourist profile or location not found

### Flutter Error Handling Example
```dart
try {
  final locations = await locationService.getFamilyLocations();
  // Update UI with locations
} catch (e) {
  if (e.toString().contains('401')) {
    // Redirect to login
  } else if (e.toString().contains('403')) {
    // Show permission denied message
  } else {
    // Show generic error
  }
}
```

## 📱 Testing

### Manual Testing
1. Register multiple users and create family relationships
2. Start location sharing on one device
3. Check family locations from another device
4. Test emergency SOS functionality

### API Testing with Postman
Import the provided Postman collection to test all endpoints.

## 🔮 Future Enhancements
- WebSocket implementation for real-time updates
- Geofencing alerts
- Location-based notifications
- Route sharing and tracking
- Offline location caching

This polling-based approach gives you a solid foundation for live location sharing that's perfect for a hackathon prototype!