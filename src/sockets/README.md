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

## 💻 Frontend Integration

### Installation

```bash
npm install socket.io-client
```

### Basic Usage

```typescript
import io from 'socket.io-client';

// Connect to socket server
const socket = io('http://localhost:8080', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for connection
socket.on('connect', () => {
  console.log('Connected to YatraID location service');
  
  // Join family tracking
  socket.emit('family:join');
});

// Listen for location updates
socket.on('location:family-update', (data) => {
  console.log('Family member moved:', data);
  // Update map marker
  updateMapMarker(data.touristId, data.location);
});

// Send location update
function updateLocation(lat, lng) {
  socket.emit('location:update', {
    latitude: lat,
    longitude: lng,
    isSharing: true,
    shareWithFamily: true
  });
}

// Send SOS
function sendSOS(lat, lng) {
  socket.emit('emergency:sos', {
    latitude: lat,
    longitude: lng,
    message: "Emergency! Need help!",
    severity: 'high'
  });
}
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useLocationSocket = (token: string) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [familyLocations, setFamilyLocations] = useState([]);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_SERVER_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('family:join');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('location:family-update', (data) => {
      setFamilyLocations(prev => 
        prev.map(member => 
          member.touristId === data.touristId 
            ? { ...member, location: data.location }
            : member
        )
      );
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [token]);

  return { socket, isConnected, familyLocations };
};
```

## 🔒 Security Features

1. **JWT Authentication**: All socket connections require valid JWT tokens
2. **Family Permissions**: Only family members can see each other's locations
3. **Emergency Override**: Emergency alerts override privacy settings
4. **Rate Limiting**: Built-in protection against spam
5. **Data Validation**: All location data is validated on server

## 📱 Mobile Integration

### React Native Example

```typescript
import io from 'socket.io-client';
import Geolocation from '@react-native-geolocation-service';

class LocationTracker {
  constructor(token) {
    this.socket = io('your-server-url', { auth: { token } });
    this.watchId = null;
  }

  startTracking() {
    this.watchId = Geolocation.watchPosition(
      (position) => {
        this.socket.emit('location:update', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed
        });
      },
      (error) => console.error(error),
      { 
        enableHighAccuracy: true, 
        distanceFilter: 10,
        interval: 10000
      }
    );
  }

  stopTracking() {
    if (this.watchId) {
      Geolocation.clearWatch(this.watchId);
    }
  }
}
```

## 🔧 Configuration Options

### Socket.IO Server Options

```typescript
// In app.ts
const socketService = new SocketService(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});
```

### Location Update Frequency

```typescript
// Adjust in location handlers
const UPDATE_THRESHOLD = 25; // meters
const UPDATE_INTERVAL = 10;  // seconds
```

## 📊 Performance Considerations

1. **Battery Optimization**: Use movement thresholds to reduce updates
2. **Memory Management**: Limit location history to 10 entries
3. **Connection Pooling**: Socket connections are reused
4. **Data Compression**: JSON data is minimized
5. **Fallback**: REST API available if sockets fail

## 🧪 Testing

### Socket Event Testing

```typescript
// Test location update
socket.emit('location:update', {
  latitude: 28.6139,
  longitude: 77.2090,
  isSharing: true
});

// Test emergency
socket.emit('emergency:sos', {
  latitude: 28.6139,
  longitude: 77.2090,
  message: "Test emergency"
});
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