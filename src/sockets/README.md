# YatraID Real-Time Location Tracking with Socket.IO

This implementation provides real-time location tracking, family monitoring, and emergency alert system using Socket.IO for the YatraID tourist safety platform.

## 🏗️ Architecture Overview

```
Frontend (Mobile/Web) <---> Socket.IO <---> Backend Controllers
                                |
                            Database (MongoDB)
                                |
                         Location Collection
```

## 📁 File Structure

```
src/
├── sockets/
│   ├── index.ts                 # Main socket service
│   ├── locationHandlers.ts      # Location tracking handlers
│   ├── familyHandlers.ts        # Family management handlers
│   ├── emergencyHandlers.ts     # Emergency/SOS handlers
│   └── client-example.ts        # Frontend integration example
├── controllers/
│   └── location.socket.controllers.ts  # Socket-enabled REST endpoints
└── routes/
    └── location.socket.routes.ts       # Combined REST + Socket routes
```

## 🚀 Setup Instructions

### 1. Install Dependencies

The following packages are already included in your package.json:
- `socket.io`: Server-side Socket.IO
- `express`: Web framework
- `jsonwebtoken`: For authentication

### 2. Environment Variables

Add to your `.env` file:
```env
# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Socket.IO Configuration (optional)
SOCKET_TRANSPORTS=websocket,polling
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
```

### 3. Server Integration

The socket service is automatically initialized in `app.ts`. No additional setup required.

## 📡 Real-Time Events

### Location Events

#### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `location:update` | `{latitude, longitude, accuracy?, altitude?, heading?, speed?, isSharing?, shareWithFamily?}` | Update current location |
| `location:toggle-sharing` | `{isSharing, shareWithFamily}` | Toggle location sharing |
| `location:request-family` | `{}` | Request family locations |
| `location:request-tourist` | `{touristId}` | Request specific tourist location |
| `location:request-history` | `{touristId, hours?}` | Request location history |
| `location:join-tracking` | `{touristId}` | Join location tracking for tourist |
| `location:leave-tracking` | `{touristId}` | Leave location tracking |

#### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `location:updated` | `{touristId, location, isSharing, timestamp}` | Location update confirmation |
| `location:family-update` | `{touristId, touristName, location, timestamp}` | Family member location update |
| `location:family-locations` | `[{touristId, fullName, location, isOnline}]` | All family locations |
| `location:live-update` | `{touristId, location, timestamp}` | Real-time location update |
| `location:sharing-updated` | `{touristId, isSharing, shareWithFamily}` | Sharing settings changed |
| `location:sharing-stopped` | `{touristId, timestamp}` | Member stopped sharing |
| `location:error` | `{message}` | Location operation error |

### Emergency Events

#### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `emergency:sos` | `{latitude, longitude, message?, severity?, type?}` | Send SOS alert |
| `emergency:cancel-sos` | `{alertId, reason?}` | Cancel SOS alert |
| `emergency:respond` | `{alertId, touristId, response, message?, eta?}` | Respond to emergency |
| `emergency:update-status` | `{alertId, status, message?, location?}` | Update emergency status |

#### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `emergency:family-alert` | `{touristId, touristName, location, message, severity, alertId}` | Emergency alert from family member |
| `emergency:sos-sent` | `{alertId, location, message, timestamp, familyNotified}` | SOS confirmation |
| `emergency:response-received` | `{alertId, responderTouristId, response, message, eta}` | Response to your emergency |
| `emergency:sos-cancelled` | `{alertId, reason, cancelledAt}` | SOS cancelled |
| `emergency:error` | `{message}` | Emergency operation error |

### Family Events

#### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `family:join` | `{}` | Join family tracking |
| `family:member-status` | `{status, message?}` | Update status (`safe`, `help_needed`, `emergency`, `offline`) |
| `family:send-message` | `{familyId, message, type?}` | Send family message |
| `family:request-members` | `{}` | Request family member list |

#### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `family:joined` | `{familyIds, timestamp}` | Joined family tracking |
| `family:member-status-update` | `{touristId, status, message, timestamp}` | Family member status change |
| `family:new-member` | `{touristId, fullName, relationship, addedBy}` | New family member added |
| `family:members-list` | `{members: [{touristId, fullName, isOnline, hasLocation}]}` | Family member list |
| `family:error` | `{message}` | Family operation error |

## 🔧 API Endpoints

### Socket-Enhanced REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/locations/realtime/update` | Update location with socket notifications |
| `GET` | `/api/locations/realtime/family` | Get family locations with real-time data |
| `POST` | `/api/locations/realtime/emergency` | Emergency SOS with socket broadcasts |
| `GET` | `/api/locations/realtime/status` | Get real-time connection status |

### Traditional REST Endpoints

All existing location endpoints remain available:
- `/api/locations/update`
- `/api/locations/family`
- `/api/locations/emergency`
- `/api/locations/settings`

## 💻 Flutter Frontend Integration

### Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  socket_io_client: ^2.0.3+1
  geolocator: ^10.1.0
  permission_handler: ^11.3.1
  flutter_map: ^6.1.0  # For map display (optional)
```

### Basic Flutter Usage

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:geolocator/geolocator.dart';

class LocationSocketService {
  IO.Socket? socket;
  bool isConnected = false;
  
  // Initialize socket connection
  void initSocket(String token) {
    socket = IO.io('http://your-server-url:8080', 
      IO.OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({'token': token})
        .build()
    );
    
    socket?.connect();
    
    // Connection listeners
    socket?.onConnect((_) {
      print('Connected to YatraID location service');
      isConnected = true;
      joinFamilyTracking();
    });
    
    socket?.onDisconnect((_) {
      print('Disconnected from server');
      isConnected = false;
    });
    
    // Location update listener
    socket?.on('location:family-update', (data) {
      print('Family member moved: $data');
      // Update UI with new location
      _handleFamilyLocationUpdate(data);
    });
    
    // Emergency alert listener
    socket?.on('emergency:family-alert', (data) {
      print('Emergency alert: $data');
      _showEmergencyAlert(data);
    });
  }
  
  // Join family tracking
  void joinFamilyTracking() {
    socket?.emit('family:join', {});
  }
  
  // Send location update
  void updateLocation(double lat, double lng) {
    socket?.emit('location:update', {
      'latitude': lat,
      'longitude': lng,
      'isSharing': true,
      'shareWithFamily': true,
      'timestamp': DateTime.now().millisecondsSinceEpoch
    });
  }
  
  // Send SOS alert
  void sendSOS(double lat, double lng, {String? message}) {
    socket?.emit('emergency:sos', {
      'latitude': lat,
      'longitude': lng,
      'message': message ?? 'Emergency! Need help!',
      'severity': 'high',
      'timestamp': DateTime.now().millisecondsSinceEpoch
    });
  }
  
  // Handle family location updates
  void _handleFamilyLocationUpdate(dynamic data) {
    // Update your state management (Provider, Bloc, etc.)
    // Example: Update map markers, family member list
  }
  
  // Show emergency alert
  void _showEmergencyAlert(dynamic data) {
    // Show emergency dialog or notification
    // Navigate to emergency screen
  }
  
  // Dispose socket
  void dispose() {
    socket?.disconnect();
    socket?.dispose();
  }
}
```

### Complete Flutter Service Example

```dart
// location_service.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';

class YatraLocationService extends ChangeNotifier {
  IO.Socket? _socket;
  Timer? _locationTimer;
  bool _isConnected = false;
  bool _isTracking = false;
  List<Map<String, dynamic>> _familyLocations = [];
  
  // Getters
  bool get isConnected => _isConnected;
  bool get isTracking => _isTracking;
  List<Map<String, dynamic>> get familyLocations => _familyLocations;
  
  // Initialize service
  Future<void> initialize(String token, String serverUrl) async {
    await _requestPermissions();
    _initSocket(token, serverUrl);
  }
  
  // Request location permissions
  Future<void> _requestPermissions() async {
    await Permission.location.request();
    await Permission.locationWhenInUse.request();
  }
  
  // Initialize socket
  void _initSocket(String token, String serverUrl) {
    _socket = IO.io(serverUrl, 
      IO.OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({'token': token})
        .enableForceNew()
        .build()
    );
    
    _socket?.connect();
    _setupSocketListeners();
  }
  
  // Setup socket event listeners
  void _setupSocketListeners() {
    _socket?.onConnect((_) {
      _isConnected = true;
      notifyListeners();
      print('✅ Connected to YatraID');
      _socket?.emit('family:join', {});
    });
    
    _socket?.onDisconnect((_) {
      _isConnected = false;
      notifyListeners();
      print('❌ Disconnected from YatraID');
    });
    
    // Family location updates
    _socket?.on('location:family-update', (data) {
      _updateFamilyLocation(data);
    });
    
    // Family locations list
    _socket?.on('location:family-locations', (data) {
      _familyLocations = List<Map<String, dynamic>>.from(data);
      notifyListeners();
    });
    
    // Emergency alerts
    _socket?.on('emergency:family-alert', (data) {
      _handleEmergencyAlert(data);
    });
    
    // SOS confirmation
    _socket?.on('emergency:sos-sent', (data) {
      _showSOSConfirmation(data);
    });
    
    // Error handling
    _socket?.on('location:error', (data) {
      print('Location error: ${data['message']}');
    });
  }
  
  // Start location tracking
  Future<void> startLocationTracking() async {
    if (_isTracking) return;
    
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled');
    }
    
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permissions are denied');
      }
    }
    
    _isTracking = true;
    notifyListeners();
    
    // Start periodic location updates
    _locationTimer = Timer.periodic(Duration(seconds: 10), (timer) async {
      try {
        Position position = await Geolocator.getCurrentPosition();
        _sendLocationUpdate(position);
      } catch (e) {
        print('Error getting location: $e');
      }
    });
  }
  
  // Stop location tracking
  void stopLocationTracking() {
    _locationTimer?.cancel();
    _isTracking = false;
    notifyListeners();
  }
  
  // Send location update
  void _sendLocationUpdate(Position position) {
    _socket?.emit('location:update', {
      'latitude': position.latitude,
      'longitude': position.longitude,
      'accuracy': position.accuracy,
      'altitude': position.altitude,
      'heading': position.heading,
      'speed': position.speed,
      'isSharing': true,
      'shareWithFamily': true,
      'timestamp': DateTime.now().millisecondsSinceEpoch
    });
  }
  
  // Send manual location update
  Future<void> sendCurrentLocation() async {
    try {
      Position position = await Geolocator.getCurrentPosition();
      _sendLocationUpdate(position);
    } catch (e) {
      print('Error sending location: $e');
    }
  }
  
  // Send SOS alert
  Future<void> sendSOS({String? message}) async {
    try {
      Position position = await Geolocator.getCurrentPosition();
      
      _socket?.emit('emergency:sos', {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'message': message ?? 'Emergency! Need immediate help!',
        'severity': 'high',
        'type': 'general',
        'timestamp': DateTime.now().millisecondsSinceEpoch
      });
    } catch (e) {
      print('Error sending SOS: $e');
    }
  }
  
  // Update family member location
  void _updateFamilyLocation(Map<String, dynamic> data) {
    int index = _familyLocations.indexWhere(
      (member) => member['touristId'] == data['touristId']
    );
    
    if (index != -1) {
      _familyLocations[index] = {
        ..._familyLocations[index],
        'location': data['location'],
        'timestamp': data['timestamp']
      };
    } else {
      _familyLocations.add(data);
    }
    
    notifyListeners();
  }
  
  // Handle emergency alert
  void _handleEmergencyAlert(Map<String, dynamic> data) {
    // Show emergency notification
    // You can use flutter_local_notifications or show dialog
    print('🚨 EMERGENCY ALERT: ${data['message']}');
    print('From: ${data['touristName']}');
    print('Location: ${data['location']}');
    
    // Navigate to emergency screen or show dialog
    // NavigationService.navigateToEmergency(data);
  }
  
  // Show SOS confirmation
  void _showSOSConfirmation(Map<String, dynamic> data) {
    print('✅ SOS Alert sent successfully');
    print('Alert ID: ${data['alertId']}');
    print('Family notified: ${data['familyNotified']}');
  }
  
  // Request family locations
  void requestFamilyLocations() {
    _socket?.emit('location:request-family', {});
  }
  
  // Update member status
  void updateMemberStatus(String status, {String? message}) {
    _socket?.emit('family:member-status', {
      'status': status, // 'safe', 'help_needed', 'emergency', 'offline'
      'message': message,
      'timestamp': DateTime.now().millisecondsSinceEpoch
    });
  }
  
  // Send family message
  void sendFamilyMessage(String familyId, String message) {
    _socket?.emit('family:send-message', {
      'familyId': familyId,
      'message': message,
      'type': 'text',
      'timestamp': DateTime.now().millisecondsSinceEpoch
    });
  }
  
  // Dispose service
  @override
  void dispose() {
    _locationTimer?.cancel();
    _socket?.disconnect();
    _socket?.dispose();
    super.dispose();
  }
}
```

### Flutter UI Integration Example

```dart
// location_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class LocationTrackingScreen extends StatefulWidget {
  @override
  _LocationTrackingScreenState createState() => _LocationTrackingScreenState();
}

class _LocationTrackingScreenState extends State<LocationTrackingScreen> {
  @override
  void initState() {
    super.initState();
    
    // Initialize location service
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final locationService = Provider.of<YatraLocationService>(context, listen: false);
      locationService.initialize('your-jwt-token', 'http://your-server:8080');
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('YatraID Location'),
        actions: [
          Consumer<YatraLocationService>(
            builder: (context, service, child) {
              return Icon(
                service.isConnected ? Icons.wifi : Icons.wifi_off,
                color: service.isConnected ? Colors.green : Colors.red,
              );
            },
          ),
        ],
      ),
      body: Consumer<YatraLocationService>(
        builder: (context, service, child) {
          return Column(
            children: [
              // Connection Status
              Container(
                padding: EdgeInsets.all(16),
                color: service.isConnected ? Colors.green.shade100 : Colors.red.shade100,
                child: Row(
                  children: [
                    Icon(service.isConnected ? Icons.check_circle : Icons.error),
                    SizedBox(width: 8),
                    Text(service.isConnected ? 'Connected' : 'Disconnected'),
                  ],
                ),
              ),
              
              // Tracking Controls
              Padding(
                padding: EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: service.isTracking 
                          ? service.stopLocationTracking
                          : service.startLocationTracking,
                        child: Text(service.isTracking ? 'Stop Tracking' : 'Start Tracking'),
                      ),
                    ),
                    SizedBox(width: 16),
                    ElevatedButton(
                      onPressed: service.sendCurrentLocation,
                      child: Text('Send Location'),
                    ),
                  ],
                ),
              ),
              
              // SOS Button
              Padding(
                padding: EdgeInsets.all(16),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      padding: EdgeInsets.symmetric(vertical: 16),
                    ),
                    onPressed: () => _showSOSDialog(service),
                    child: Text(
                      'EMERGENCY SOS',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
              
              // Family Locations
              Expanded(
                child: ListView.builder(
                  itemCount: service.familyLocations.length,
                  itemBuilder: (context, index) {
                    final member = service.familyLocations[index];
                    return ListTile(
                      leading: CircleAvatar(
                        child: Text(member['touristName'][0]),
                      ),
                      title: Text(member['touristName']),
                      subtitle: Text(
                        'Lat: ${member['location']['latitude']?.toStringAsFixed(4)}, '
                        'Lng: ${member['location']['longitude']?.toStringAsFixed(4)}'
                      ),
                      trailing: Icon(
                        Icons.location_on,
                        color: Colors.green,
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
  
  void _showSOSDialog(YatraLocationService service) {
    final messageController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Send SOS Alert'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('This will alert all your family members!'),
            SizedBox(height: 16),
            TextField(
              controller: messageController,
              decoration: InputDecoration(
                labelText: 'Emergency Message (Optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              service.sendSOS(message: messageController.text.trim());
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('SOS Alert Sent!')),
              );
            },
            child: Text('Send SOS'),
          ),
        ],
      ),
    );
  }
}
```

## 🔒 Security Features

1. **JWT Authentication**: All socket connections require valid JWT tokens
2. **Family Permissions**: Only family members can see each other's locations
3. **Emergency Override**: Emergency alerts override privacy settings
4. **Rate Limiting**: Built-in protection against spam
5. **Data Validation**: All location data is validated on server

## 📱 Flutter App Integration

### Provider Setup (main.dart)

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

void main() {
  runApp(
    ChangeNotifierProvider(
      create: (context) => YatraLocationService(),
      child: MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YatraID',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: LocationTrackingScreen(),
    );
  }
}
```

### Background Location Tracking

```dart
// background_location_service.dart
import 'dart:isolate';
import 'dart:ui';
import 'package:geolocator/geolocator.dart';

class BackgroundLocationService {
  static const String isolateName = 'LocatorIsolate';
  
  static void startBackgroundTracking() {
    IsolateNameServer.registerPortWithName(
      ReceivePort().sendPort, 
      isolateName
    );
  }
  
  @pragma('vm:entry-point')
  static void backgroundLocationCallback(LocationDto locationDto) {
    final SendPort? send = IsolateNameServer.lookupPortByName(isolateName);
    send?.send(locationDto);
  }
  
  static void handleLocationUpdate(LocationDto location) {
    // Send to socket service
    final socketService = YatraLocationService();
    socketService.sendLocationUpdate(
      location.latitude, 
      location.longitude
    );
  }
}
```

### Flutter Map Integration

```dart
// map_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

class LiveMapScreen extends StatefulWidget {
  @override
  _LiveMapScreenState createState() => _LiveMapScreenState();
}

class _LiveMapScreenState extends State<LiveMapScreen> {
  final MapController _mapController = MapController();
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Live Family Map')),
      body: Consumer<YatraLocationService>(
        builder: (context, service, child) {
          return FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              center: LatLng(28.6139, 77.2090), // Delhi default
              zoom: 13.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.yatraid.app',
              ),
              MarkerLayer(
                markers: service.familyLocations.map((member) {
                  final location = member['location'];
                  return Marker(
                    point: LatLng(
                      location['latitude'], 
                      location['longitude']
                    ),
                    builder: (context) => Container(
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundColor: Colors.blue,
                            child: Text(
                              member['touristName'][0],
                              style: TextStyle(color: Colors.white),
                            ),
                          ),
                          Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: 8, 
                              vertical: 4
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(4),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black26,
                                  blurRadius: 4,
                                ),
                              ],
                            ),
                            child: Text(
                              member['touristName'],
                              style: TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Center map on user location
          _centerMapOnUser();
        },
        child: Icon(Icons.my_location),
      ),
    );
  }
  
  void _centerMapOnUser() async {
    try {
      Position position = await Geolocator.getCurrentPosition();
      _mapController.move(
        LatLng(position.latitude, position.longitude), 
        15.0
      );
    } catch (e) {
      print('Error getting current location: $e');
    }
  }
}
```

### Flutter Emergency Alert Widget

```dart
// emergency_widget.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class EmergencyAlertWidget extends StatelessWidget {
  final Map<String, dynamic> alertData;
  
  const EmergencyAlertWidget({Key? key, required this.alertData}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.all(16),
      color: Colors.red.shade50,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning, color: Colors.red, size: 32),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'EMERGENCY ALERT',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.red,
                    ),
                  ),
                ),
                Text(
                  _formatTime(alertData['timestamp']),
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
            SizedBox(height: 12),
            Text(
              'From: ${alertData['touristName']}',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(alertData['message'] ?? 'Emergency situation'),
            SizedBox(height: 12),
            Text(
              'Location: ${alertData['location']['latitude'].toStringAsFixed(4)}, '
              '${alertData['location']['longitude'].toStringAsFixed(4)}',
              style: TextStyle(color: Colors.grey[600]),
            ),
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _respondToEmergency(context, 'on_way'),
                    icon: Icon(Icons.directions_run),
                    label: Text('I\'m Coming'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                    ),
                  ),
                ),
                SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _callEmergencyServices(context),
                    icon: Icon(Icons.phone),
                    label: Text('Call 112'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  String _formatTime(int timestamp) {
    final DateTime time = DateTime.fromMillisecondsSinceEpoch(timestamp);
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }
  
  void _respondToEmergency(BuildContext context, String response) {
    final service = Provider.of<YatraLocationService>(context, listen: false);
    service.respondToEmergency(alertData['alertId'], response);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Response sent: $response')),
    );
  }
  
  void _callEmergencyServices(BuildContext context) {
    // Implement phone call to emergency services
    // You can use url_launcher package
  }
}
```

### Flutter Notification Integration

```dart
// notification_service.dart
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notifications = 
      FlutterLocalNotificationsPlugin();
  
  static Future<void> initialize() async {
    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const InitializationSettings settings = InitializationSettings(
      android: androidSettings,
    );
    
    await _notifications.initialize(settings);
  }
  
  static Future<void> showEmergencyAlert(Map<String, dynamic> alertData) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'emergency_channel',
      'Emergency Alerts',
      channelDescription: 'Notifications for emergency situations',
      importance: Importance.max,
      priority: Priority.high,
      color: Colors.red,
      playSound: true,
      enableVibration: true,
    );
    
    const NotificationDetails details = NotificationDetails(android: androidDetails);
    
    await _notifications.show(
      0,
      '🚨 EMERGENCY ALERT',
      '${alertData['touristName']}: ${alertData['message']}',
      details,
      payload: alertData['alertId'],
    );
  }
  
  static Future<void> showLocationUpdate(Map<String, dynamic> locationData) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'location_channel',
      'Location Updates',
      channelDescription: 'Family member location updates',
      importance: Importance.low,
      priority: Priority.low,
      showWhen: false,
    );
    
    const NotificationDetails details = NotificationDetails(android: androidDetails);
    
    await _notifications.show(
      1,
      'Family Location Update',
      '${locationData['touristName']} shared their location',
      details,
    );
  }
}
```

### Flutter Permission Handler

```dart
// permission_service.dart
import 'package:permission_handler/permission_handler.dart';
import 'package:geolocator/geolocator.dart';

class PermissionService {
  static Future<bool> requestLocationPermissions() async {
    // Check if location services are enabled
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }
    
    // Request location permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      return false;
    }
    
    // Request background location permission (Android 10+)
    await Permission.locationAlways.request();
    
    return true;
  }
  
  static Future<bool> requestNotificationPermissions() async {
    final status = await Permission.notification.request();
    return status == PermissionStatus.granted;
  }
  
  static Future<void> openAppSettings() async {
    await openAppSettings();
  }
}
```

## 🔧 Flutter Configuration

### Android Configuration (android/app/src/main/AndroidManifest.xml)

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Location Permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    
    <!-- Network Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Notification Permissions -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
    
    <application
        android:label="YatraID"
        android:name="${applicationName}"
        android:icon="@mipmap/ic_launcher">
        
        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme">
            
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        
        <!-- Background Location Service -->
        <service
            android:name="de.esys.flutter_background_service.BackgroundService" 
            android:foregroundServiceType="location" />
            
    </application>
</manifest>
```

### iOS Configuration (ios/Runner/Info.plist)

```xml
<dict>
    <!-- Location Permissions -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>YatraID needs location access to track your safety and share with family members.</string>
    
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>YatraID needs continuous location access to provide real-time safety monitoring.</string>
    
    <!-- Background Modes -->
    <key>UIBackgroundModes</key>
    <array>
        <string>location</string>
        <string>background-fetch</string>
        <string>remote-notification</string>
    </array>
</dict>
```

## 📊 Performance Considerations

1. **Battery Optimization**: Use movement thresholds to reduce updates
2. **Memory Management**: Limit location history to 10 entries
3. **Connection Pooling**: Socket connections are reused
4. **Data Compression**: JSON data is minimized
5. **Fallback**: REST API available if sockets fail

## 🧪 Flutter Testing

### Socket Connection Testing

```dart
// test/socket_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

void main() {
  group('YatraLocationService Tests', () {
    late YatraLocationService service;
    
    setUp(() {
      service = YatraLocationService();
    });
    
    test('should connect to socket server', () async {
      await service.initialize('test-token', 'http://localhost:8080');
      
      // Wait for connection
      await Future.delayed(Duration(seconds: 2));
      
      expect(service.isConnected, true);
    });
    
    test('should send location update', () async {
      await service.initialize('test-token', 'http://localhost:8080');
      
      // Mock location update
      service.sendLocationUpdate(28.6139, 77.2090);
      
      // Verify socket emission
      // Add verification logic here
    });
    
    test('should handle emergency alert', () async {
      await service.initialize('test-token', 'http://localhost:8080');
      
      // Test SOS functionality
      await service.sendSOS(message: 'Test emergency');
      
      // Verify alert was sent
      // Add verification logic here
    });
  });
}
```

### Widget Testing

```dart
// test/widget_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('LocationTrackingScreen displays correctly', (WidgetTester tester) async {
    // Create mock service
    final mockService = MockYatraLocationService();
    
    // Build widget
    await tester.pumpWidget(
      MaterialApp(
        home: ChangeNotifierProvider<YatraLocationService>.value(
          value: mockService,
          child: LocationTrackingScreen(),
        ),
      ),
    );
    
    // Verify UI elements
    expect(find.text('Connected'), findsOneWidget);
    expect(find.text('Start Tracking'), findsOneWidget);
    expect(find.text('EMERGENCY SOS'), findsOneWidget);
  });
}
```

## 🔧 Flutter Configuration Options

### Socket.IO Server Options

```typescript
// In app.ts
const socketService = new SocketService(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  cors: {
    origin: process.env.FLUTTER_APP_URL, // Your Flutter app URL
    credentials: true
  }
});
```

### Flutter Location Update Settings

```dart
// In YatraLocationService
class LocationSettings {
  static const int UPDATE_INTERVAL_SECONDS = 10;
  static const double UPDATE_THRESHOLD_METERS = 25.0;
  static const int LOCATION_TIMEOUT_SECONDS = 30;
  static const bool HIGH_ACCURACY = true;
  
  static const LocationSettings highAccuracy = LocationSettings(
    accuracy: LocationAccuracy.best,
    distanceFilter: UPDATE_THRESHOLD_METERS,
    timeLimit: Duration(seconds: LOCATION_TIMEOUT_SECONDS),
  );
}
```

## 🚨 Emergency Features

1. **Automatic SOS**: Falls back to SMS if socket fails
2. **Location Override**: Forces location sharing during emergencies
3. **Family Broadcast**: Notifies all family members instantly
4. **Evidence Upload**: Real-time evidence sharing
5. **Response Tracking**: Track family member responses

## 📈 Monitoring & Analytics

- Connection status tracking
- Location update frequency
- Emergency response times
- Family interaction patterns
- Battery usage optimization

## 🔄 Future Enhancements

1. **Geofencing**: Real-time safe zone alerts
2. **Predictive Tracking**: ML-based location prediction
3. **Offline Support**: Store and sync when reconnected
4. **Video Calls**: Emergency video communication
5. **Smart Alerts**: Context-aware notifications

## ❓ Questions & Answers

**Q: How often should location be updated?**
A: Every 10 seconds or when movement exceeds 25 meters.

**Q: What happens if socket connection fails?**
A: System falls back to REST API polling every 30 seconds.

**Q: How is battery life optimized?**
A: Using movement thresholds, connection pooling, and smart update intervals.

**Q: Can I disable real-time tracking?**
A: Yes, use the traditional REST endpoints or disable socket connections.

**Q: How secure is the real-time data?**
A: All connections are JWT authenticated with family-based permissions.

---

This real-time location system provides a robust foundation for live tracking, family safety, and emergency response in your YatraID platform! 🚀