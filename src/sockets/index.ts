import { Server as SocketIOServer, Socket } from "socket.io";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import Tourist from "../models/Tourist";
import { locationSocketHandlers } from "./locationHandlers";
import { familySocketHandlers } from "./familyHandlers";
import { emergencySocketHandlers } from "./emergencyHandlers";

export interface AuthenticatedSocket extends Socket {
  user?: {
    _id: string;
    email: string;
    touristId?: string;
  };
}

class SocketService {
  private io: SocketIOServer;
  private connectedUsers = new Map<string, string>(); // userId -> socketId
  private userLocations = new Map<string, any>(); // touristId -> latest location data

  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupConnectionHandling();
  }

  private setupMiddleware() {
    // Authentication middleware for socket connections
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findById(decoded.id).select('_id email');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        // Get tourist profile if exists
        const tourist = await Tourist.findOne({ userId: user._id }).select('touristId fullName');
        
        socket.user = {
          _id: String(user._id),
          email: user.email,
          touristId: tourist?.touristId
        };

        console.log(`🔗 Socket authenticated for user: ${user.email} (Tourist: ${tourist?.touristId || 'N/A'})`);
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupConnectionHandling() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`📱 User connected: ${socket.user?.email} (Socket: ${socket.id})`);
      
      // Store user connection
      if (socket.user) {
        this.connectedUsers.set(socket.user._id, socket.id);
        
        // Join user to their personal room
        socket.join(`user:${socket.user._id}`);
        
        // Join tourist-specific room if tourist profile exists
        if (socket.user.touristId) {
          socket.join(`tourist:${socket.user.touristId}`);
          console.log(`👤 Tourist ${socket.user.touristId} joined location tracking`);
        }
      }

      // Register event handlers
      this.registerHandlers(socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`📱 User disconnected: ${socket.user?.email}`);
        if (socket.user) {
          this.connectedUsers.delete(socket.user._id);
          
          // Clean up location data on disconnect
          if (socket.user.touristId) {
            this.userLocations.delete(socket.user.touristId);
          }
        }
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.user?.email}:`, error);
      });
    });
  }

  private registerHandlers(socket: AuthenticatedSocket) {
    // Location tracking handlers
    locationSocketHandlers(socket, this);
    
    // Family tracking handlers
    familySocketHandlers(socket, this);
    
    // Emergency/SOS handlers
    emergencySocketHandlers(socket, this);
  }

  // Public methods for other parts of the application to use
  public getIO(): SocketIOServer {
    return this.io;
  }

  public getUserLocation(touristId: string) {
    return this.userLocations.get(touristId);
  }

  public setUserLocation(touristId: string, location: any) {
    this.userLocations.set(touristId, location);
  }

  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getConnectedUsers(): Map<string, string> {
    return this.connectedUsers;
  }

  public emitToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public emitToTourist(touristId: string, event: string, data: any) {
    this.io.to(`tourist:${touristId}`).emit(event, data);
  }

  public emitToFamily(touristIds: string[], event: string, data: any) {
    touristIds.forEach(id => {
      this.io.to(`tourist:${id}`).emit(event, data);
    });
  }

  public broadcastEmergency(data: any) {
    this.io.emit('emergency:broadcast', data);
  }
}

export default SocketService;