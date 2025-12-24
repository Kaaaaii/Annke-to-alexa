import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import cameraRoutes from './routes/cameras';
import webrtcRoutes from './routes/webrtc';
import configRoutes from './routes/config';
import alexaRoutes from './routes/alexa';
import authRoutes from './routes/auth';
import go2rtcProxy from './routes/go2rtc';
import streamRoutes from './routes/stream';
import { DiscoveryService } from './services/discovery';
import { WebRTCService } from './services/webrtc';
import { setupWebSocketServer } from './services/signaling';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow WebRTC
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: config.corsOrigins,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
// log all requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

// API Routes
app.use('/api/cameras', cameraRoutes);
app.use('/api/webrtc', webrtcRoutes);
app.use('/api/config', configRoutes);
app.use('/api/alexa', alexaRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/auth', authRoutes);

// Proxy go2rtc through Express (hides port 1984)
app.use('/go2rtc', go2rtcProxy);

// Serve dashboard
app.use(express.static('public'));

// WebSocket signaling server
setupWebSocketServer(wss);

// Error handling
app.use(errorHandler);

// Initialize services
async function initializeServices() {
    try {
        logger.info('Initializing services...');

        // Initialize WebRTC service
        const webrtcService = WebRTCService.getInstance();
        await webrtcService.initialize();

        // Initialize discovery service if enabled
        if (config.autoDiscover) {
            const discoveryService = DiscoveryService.getInstance();
            await discoveryService.startAutoDiscovery();
        }

        logger.info('All services initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize services:', error);
        throw error;
    }
}

// Start server
async function start() {
    try {
        await initializeServices();

        server.listen(config.port, () => {
            logger.info(`🚀 Server running on port ${config.port}`);
            logger.info(`📡 Environment: ${config.nodeEnv}`);
            logger.info(`🎥 Auto-discovery: ${config.autoDiscover ? 'enabled' : 'disabled'}`);
            logger.info(`🔐 JWT expiry: ${config.jwtExpiry}`);

            if (config.cloudflareUrl) {
                logger.info(`☁️  Cloudflare URL: ${config.cloudflareUrl}`);
            }
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

// Start the application
start();
