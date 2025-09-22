// Client-side Socket.IO implementation example for YatraID Location Tracking
// This file shows how to integrate the real-time location system in your frontend

import io from 'socket.io-client';

class YatraLocationService {
  private socket: any;
  private isConnected = false;
  private currentLocation: any = null;
  private callbacks = new Map();

  constructor(serverUrl: string, token: string) {
    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('🔗 Connected to YatraID location service');
      this.isConnected = true;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', () => {
      console.log('📱 Disconnected from YatraID location service');
      this.isConnected = false;
      this.emit('connection', { status: 'disconnected' });
    });

    // Location events
    this.socket.on('location:updated', (data: any) => {
      console.log('📍 Location updated:', data);
      this.emit('locationUpdated', data);
    });

    this.socket.on('location:family-update', (data: any) => {
      console.log('👨‍👩‍👧‍👦 Family member location update:', data);
      this.emit('familyLocationUpdate', data);
    });

    this.socket.on('location:family-locations', (data: any) => {
      console.log('👨‍👩‍👧‍👦 Family locations:', data);
      this.emit('familyLocations', data);
    });

    this.socket.on('location:live-update', (data: any) => {
      console.log('🔴 Live location update:', data);
      this.emit('liveLocationUpdate', data);
    });

    this.socket.on('location:sharing-updated', (data: any) => {
      console.log('🔄 Location sharing updated:', data);
      this.emit('sharingUpdated', data);
    });

    this.socket.on('location:sharing-stopped', (data: any) => {
      console.log('⏹️ Location sharing stopped:', data);
      this.emit('sharingStopped', data);
    });

    // Emergency events
    this.socket.on('emergency:family-alert', (data: any) => {
      console.log('🚨 EMERGENCY ALERT:', data);
      this.emit('emergencyAlert', data);
    });

    this.socket.on('emergency:sos-sent', (data: any) => {
      console.log('🆘 SOS sent:', data);
      this.emit('sosSent', data);
    });

    this.socket.on('emergency:response-received', (data: any) => {
      console.log('📞 Emergency response received:', data);
      this.emit('emergencyResponse', data);
    });

    // Family events
    this.socket.on('family:joined', (data: any) => {
      console.log('👨‍👩‍👧‍👦 Joined family tracking:', data);
      this.emit('familyJoined', data);
    });

    this.socket.on('family:member-status-update', (data: any) => {
      console.log('👤 Family member status update:', data);
      this.emit('familyMemberStatus', data);
    });

    this.socket.on('family:new-member', (data: any) => {
      console.log('➕ New family member added:', data);
      this.emit('newFamilyMember', data);
    });

    // Error handling
    this.socket.on('location:error', (error: any) => {
      console.error('❌ Location error:', error);
      this.emit('error', error);
    });

    this.socket.on('emergency:error', (error: any) => {
      console.error('❌ Emergency error:', error);
      this.emit('error', error);
    });

    this.socket.on('family:error', (error: any) => {
      console.error('❌ Family error:', error);
      this.emit('error', error);
    });
  }

  // Public methods for location tracking
  public updateLocation(locationData: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    heading?: number;
    speed?: number;
    isSharing?: boolean;
    shareWithFamily?: boolean;
  }) {
    if (!this.isConnected) {
      console.error('Not connected to location service');
      return;
    }

    this.socket.emit('location:update', locationData);
    this.currentLocation = locationData;
  }

  public toggleLocationSharing(isSharing: boolean, shareWithFamily: boolean = true) {
    if (!this.isConnected) return;
    
    this.socket.emit('location:toggle-sharing', {
      isSharing,
      shareWithFamily
    });
  }

  public requestFamilyLocations() {
    if (!this.isConnected) return;
    
    this.socket.emit('location:request-family');
  }

  public requestTouristLocation(touristId: string) {
    if (!this.isConnected) return;
    
    this.socket.emit('location:request-tourist', { touristId });
  }

  public requestLocationHistory(touristId: string, hours: number = 24) {
    if (!this.isConnected) return;
    
    this.socket.emit('location:request-history', { touristId, hours });
  }

  public joinLocationTracking(touristId: string) {
    if (!this.isConnected) return;
    
    this.socket.emit('location:join-tracking', { touristId });
  }

  public leaveLocationTracking(touristId: string) {
    if (!this.isConnected) return;
    
    this.socket.emit('location:leave-tracking', { touristId });
  }

  // Emergency methods
  public sendSOS(locationData: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    message?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    type?: 'general' | 'medical' | 'crime' | 'accident' | 'natural_disaster';
  }) {
    if (!this.isConnected) {
      console.error('Not connected to emergency service');
      return;
    }

    this.socket.emit('emergency:sos', locationData);
  }

  public cancelSOS(alertId: string, reason: string = 'False alarm') {
    if (!this.isConnected) return;
    
    this.socket.emit('emergency:cancel-sos', { alertId, reason });
  }

  public respondToEmergency(alertId: string, touristId: string, response: string, message?: string, eta?: number) {
    if (!this.isConnected) return;
    
    this.socket.emit('emergency:respond', {
      alertId,
      touristId,
      response,
      message,
      eta
    });
  }

  // Family methods
  public joinFamilyTracking() {
    if (!this.isConnected) return;
    
    this.socket.emit('family:join');
  }

  public updateMemberStatus(status: 'safe' | 'help_needed' | 'emergency' | 'offline', message?: string) {
    if (!this.isConnected) return;
    
    this.socket.emit('family:member-status', { status, message });
  }

  public requestFamilyMembers() {
    if (!this.isConnected) return;
    
    this.socket.emit('family:request-members');
  }

  public sendFamilyMessage(familyId: string, message: string, type: 'text' | 'location' | 'alert' = 'text') {
    if (!this.isConnected) return;
    
    this.socket.emit('family:send-message', { familyId, message, type });
  }

  // Event subscription methods
  public on(event: string, callback: Function) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  public off(event: string, callback: Function) {
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach((callback: Function) => {
        callback(data);
      });
    }
  }

  // Utility methods
  public isLocationServiceConnected(): boolean {
    return this.isConnected;
  }

  public getCurrentLocation(): any {
    return this.currentLocation;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Usage example:
/*
// Initialize the service
const locationService = new YatraLocationService('http://localhost:8080', 'your-jwt-token');

// Subscribe to events
locationService.on('connection', (data) => {
  console.log('Connection status:', data.status);
});

locationService.on('familyLocationUpdate', (data) => {
  console.log('Family member moved:', data);
  // Update map markers
});

locationService.on('emergencyAlert', (data) => {
  console.log('EMERGENCY ALERT:', data);
  // Show emergency notification
  // Navigate to emergency screen
});

// Start location tracking
if (navigator.geolocation) {
  navigator.geolocation.watchPosition((position) => {
    locationService.updateLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      isSharing: true,
      shareWithFamily: true
    });
  }, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 5000
  });
}

// Join family tracking
locationService.joinFamilyTracking();

// Request family locations
locationService.requestFamilyLocations();

// Send SOS in emergency
function sendEmergencySOS() {
  navigator.geolocation.getCurrentPosition((position) => {
    locationService.sendSOS({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      message: "Help! I'm in danger!",
      severity: 'critical',
      type: 'general'
    });
  });
}
*/

export default YatraLocationService;