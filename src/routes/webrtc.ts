import { Router, Request, Response } from 'express';
import { generateToken } from '../middleware/auth';
import { DiscoveryService } from '../services/discovery';
import { WebRTCService } from '../services/webrtc';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const discoveryService = DiscoveryService.getInstance();
const webrtcService = WebRTCService.getInstance();

// GET /api/token?cameraId=xxx - Generate JWT token
router.get('/token', (req: Request, res: Response) => {
    const { cameraId } = req.query;

    if (!cameraId || typeof cameraId !== 'string') {
        throw new AppError(400, 'cameraId query parameter is required');
    }

    const camera = discoveryService.getCamera(cameraId);
    if (!camera) {
        throw new AppError(404, 'Camera not found');
    }

    const token = generateToken(cameraId);

    res.json({
        success: true,
        token,
        expiresIn: '60s',
        cameraId
    });
});

// GET /api/ice-servers - Get ICE servers configuration
router.get('/ice-servers', (req: Request, res: Response) => {
    const iceServers = webrtcService.getICEServers();

    res.json({
        success: true,
        iceServers
    });
});

// GET /api/status - Get service status
router.get('/status', (req: Request, res: Response) => {
    const cameras = discoveryService.getCameras();
    const webrtcReady = webrtcService.isServiceReady();

    res.json({
        success: true,
        status: {
            webrtc: webrtcReady ? 'ready' : 'not ready',
            cameras: {
                total: cameras.length,
                online: cameras.filter(c => c.status === 'online').length,
                offline: cameras.filter(c => c.status === 'offline').length
            }
        }
    });
});

export default router;
