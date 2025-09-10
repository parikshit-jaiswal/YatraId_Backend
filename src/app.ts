import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

// Import routes
import authRoutes from "./routes/auth.routes";
import touristRoutes from "./routes/tourist.routes";
import kycRoutes from "./routes/kyc.routes";

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || ["http://localhost:3000", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/tourist", touristRoutes);
app.use("/api/kyc", kycRoutes);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    message: "YatraID Backend is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    routes: [
      "/api/auth",
      "/api/tourist", 
      "/api/kyc"
    ]
  });
});

// API info endpoint
app.get("/api", (req: Request, res: Response) => {
  res.json({
    message: "YatraID Tourist Safety API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      tourist: "/api/tourist",
      kyc: "/api/kyc",
      health: "/health"
    }
  });
});

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome to YatraID API",
    version: "1.0.0",
    documentation: "/api",
    health: "/health"
  });
});

// Global error handling middleware
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Global error handler:", error);
  
  // Handle different types of errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      error: 'Validation Error',
      details: error.message 
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({ 
      error: 'Invalid ID format',
      details: error.message 
    });
  }
  
  if (error.code === 11000) {
    return res.status(400).json({ 
      error: 'Duplicate field value',
      details: 'A resource with this value already exists' 
    });
  }

  res.status(error.status || 500).json({
    error: error.message || "Internal server error",
    details: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      "/api/auth",
      "/api/tourist",
      "/api/kyc",
      "/health"
    ]
  });
});

// Export using CommonJS syntax
export { app, io, httpServer };
