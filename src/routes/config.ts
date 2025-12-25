import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const CONFIG_PATH = process.env.CONFIG_PATH || path.join(process.cwd(), 'data', 'config.json');

interface AppConfig {
    dvr?: {
        username: string;
        password: string;
        ip?: string;
        port: number;
    };
    webrtc?: {
        stunServer: string;
        turnServer?: string;
        turnUsername?: string;
        turnPassword?: string;
    };
    cloudflare?: {
        token?: string;
    };
    discovery?: {
        autoDiscover: boolean;
        interval: number;
        maxCameras: number;
    };
    setupCompleted?: boolean;
    // Env vars not usually saved to JSON but good for type safety if we extend
    cloudflareUrl?: string;
    go2rtcEnabled?: boolean;
    rtspTransport?: string;
}

import { config as envConfig } from '../config';

// GET /api/config - Get current configuration (merged with env)
router.get('/', async (req: Request, res: Response) => {
    try {
        const fileConfig = await loadConfig();

        // Merge file config with env config for status display
        const mergedConfig = {
            ...fileConfig,
            dvr: { ...fileConfig.dvr, ip: envConfig.dvrIp, port: envConfig.dvrPort || fileConfig.dvr?.port },
            cloudflare: { ...fileConfig.cloudflare, token: envConfig.cloudflareToken },
            cloudflareUrl: envConfig.cloudflareUrl,
            go2rtcEnabled: envConfig.go2rtcEnabled,
            rtspTransport: envConfig.rtspTransport
        };

        // Sanitize sensitive data
        const sanitized = {
            dvr: mergedConfig.dvr ? {
                ...mergedConfig.dvr,
                password: '***'
            } : undefined,
            cloudflare: mergedConfig.cloudflare ? {
                ...mergedConfig.cloudflare,
                token: '***' // Don't expose token
            } : undefined,
            setupCompleted: fileConfig.setupCompleted || false,
            cloudflareUrl: mergedConfig.cloudflareUrl,
            go2rtcEnabled: mergedConfig.go2rtcEnabled,
            rtspTransport: mergedConfig.rtspTransport
        };

        res.json({
            success: true,
            config: sanitized
        });
    } catch (error) {
        logger.error('Failed to load config:', error);
        res.json({
            success: true,
            config: { setupCompleted: false }
        });
    }
});

// POST /api/config - Save configuration
router.post('/', async (req: Request, res: Response) => {
    try {
        const newConfig: AppConfig = req.body;

        // Validate required fields
        if (!newConfig.dvr?.username || !newConfig.dvr?.password) {
            throw new AppError(400, 'DVR username and password are required');
        }

        // Mark setup as completed
        newConfig.setupCompleted = true;

        // Save configuration
        await saveConfig(newConfig);

        // Apply configuration to running services
        await applyConfig(newConfig);

        logger.info('Configuration updated successfully');

        res.json({
            success: true,
            message: 'Configuration saved successfully'
        });
    } catch (error) {
        logger.error('Failed to save config:', error);
        throw error;
    }
});

// GET /api/config/setup-status - Check if setup is completed
router.get('/setup-status', async (req: Request, res: Response) => {
    try {
        const config = await loadConfig();
        res.json({
            success: true,
            setupCompleted: config.setupCompleted || false
        });
    } catch {
        res.json({
            success: true,
            setupCompleted: false
        });
    }
});

async function loadConfig(): Promise<AppConfig> {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Return default config if file doesn't exist
        return { setupCompleted: false };
    }
}

async function saveConfig(config: AppConfig): Promise<void> {
    const dir = path.dirname(CONFIG_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function applyConfig(config: AppConfig): Promise<void> {
    // Update environment variables for running services
    if (config.dvr) {
        process.env.DVR_USERNAME = config.dvr.username;
        process.env.DVR_PASSWORD = config.dvr.password;
        process.env.DVR_IP = config.dvr.ip;
        process.env.DVR_PORT = String(config.dvr.port);
    }

    if (config.webrtc) {
        process.env.STUN_SERVER = config.webrtc.stunServer;
        process.env.TURN_SERVER = config.webrtc.turnServer;
        process.env.TURN_USERNAME = config.webrtc.turnUsername;
        process.env.TURN_PASSWORD = config.webrtc.turnPassword;
    }

    if (config.cloudflare) {
        process.env.CLOUDFLARE_TUNNEL_TOKEN = config.cloudflare.token;
    }

    if (config.discovery) {
        process.env.AUTO_DISCOVER = String(config.discovery.autoDiscover);
        process.env.DISCOVERY_INTERVAL = String(config.discovery.interval);
        process.env.MAX_CAMERAS = String(config.discovery.maxCameras);
    }

    logger.info('Configuration applied to running services');
}

export default router;
