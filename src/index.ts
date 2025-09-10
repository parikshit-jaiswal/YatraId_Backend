import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { httpServer } from './app';
import { onchainWorker } from './worker/onchainWorker';

// Load environment variables first
dotenv.config({
    path: './.env',
});

const port: number = parseInt(process.env.PORT || '8080');

// Database connection function
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI!, {
            dbName: process.env.DB_NAME || "tourist_safety",
        });
        console.log("✅ Connected to MongoDB");
        return true;
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw error;
    }
};

// Database connection and server startup
connectDB()
    .then(() => {
        console.log('------------------------------------------------');
        console.log('✅ Database connected successfully');
        
        // Start the onchain worker after successful DB connection
        console.log('🔄 Starting onchain worker...');
        onchainWorker.start();
        
        // Start the HTTP server (includes Socket.io)
        httpServer.listen(port, () => {
            console.log('------------------------------------------------');
            console.log(`🚀 Server started successfully on port: ${port}`);
            console.log(`🔗 URL: http://localhost:${port}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('📡 Socket.io server running');
            console.log('🤖 Onchain worker active');
            console.log('------------------------------------------------');
            console.log('📋 Available API endpoints:');
            console.log(`   • Auth: http://localhost:${port}/api/auth`);
            console.log(`   • Tourist: http://localhost:${port}/api/tourist`);
            console.log(`   • KYC: http://localhost:${port}/api/kyc`);
            console.log(`   • Health: http://localhost:${port}/health`);
            console.log('------------------------------------------------');
            console.log('⌛ Server is waiting for requests...');
            console.log('------------------------------------------------');
        });
    })
    .catch((err: unknown) => {
        console.error('❌ MONGO DB connection failed!!!', err);
        console.error('💥 Shutting down server due to database connection failure');
        process.exit(1);
    });

// Graceful shutdown handlers
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received. Shutting down gracefully...');
    httpServer.close(() => {
        console.log('✅ Server closed successfully');
        mongoose.connection.close();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 SIGINT received. Shutting down gracefully...');
    httpServer.close(() => {
        console.log('✅ Server closed successfully');
        mongoose.connection.close();
        process.exit(0);
    });
});

process.on('unhandledRejection', (err: any) => {
    console.error('💥 Unhandled Rejection:', err);
    console.log('📴 Shutting down server due to unhandled promise rejection');
    httpServer.close(() => {
        mongoose.connection.close();
        process.exit(1);
    });
});

process.on('uncaughtException', (err: any) => {
    console.error('💥 Uncaught Exception:', err);
    console.log('📴 Shutting down server due to uncaught exception');
    process.exit(1);
});