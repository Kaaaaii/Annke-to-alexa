import { Router, Request, Response } from 'express';
import { DiscoveryService } from '../services/discovery';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const discoveryService = DiscoveryService.getInstance();

// GET /api/cameras - List all cameras
router.get('/', (req: Request, res: Response) => {
    const cameras = discoveryService.getCameras();
    res.json({
        success: true,
        count: cameras.length,
        cameras
    });
});

// GET /api/cameras/:id - Get specific camera
router.get('/:id', (req: Request, res: Response) => {
    const camera = discoveryService.getCamera(req.params.id);

    if (!camera) {
        throw new AppError(404, 'Camera not found');
    }

    res.json({
        success: true,
        camera
    });
});

// POST /api/cameras/discover - Trigger discovery scan
router.post('/discover', async (req: Request, res: Response) => {
    const result = await discoveryService.discoverCameras();

    res.json({
        success: true,
        ...result
    });
});

// POST /api/cameras - Manually add camera
router.post('/', (req: Request, res: Response) => {
    const { name, rtspUrl, ip, port, channel } = req.body;

    if (!name || !rtspUrl || !ip) {
        throw new AppError(400, 'Missing required fields: name, rtspUrl, ip');
    }

    const camera = {
        id: crypto.randomUUID(),
        name,
        rtspUrl,
        ip,
        port: port || 554,
        channel: channel || 1,
        status: 'unknown' as const,
        lastSeen: new Date(),
        manufacturer: 'Manual',
        model: 'Custom'
    };

    discoveryService.addCamera(camera);

    res.status(201).json({
        success: true,
        camera
    });
});

// DELETE /api/cameras/:id - Remove camera
router.delete('/:id', (req: Request, res: Response) => {
    const deleted = discoveryService.removeCamera(req.params.id);

    if (!deleted) {
        throw new AppError(404, 'Camera not found');
    }

    res.json({
        success: true,
        message: 'Camera removed'
    });
});

// PATCH /api/cameras/:id - Update camera
router.patch('/:id', (req: Request, res: Response) => {
    const { name, rtspUrl, ip, port, channel } = req.body;

    // Build updates object with only provided fields
    const updates: Partial<any> = {};
    if (name !== undefined) updates.name = name;
    if (rtspUrl !== undefined) updates.rtspUrl = rtspUrl;
    if (ip !== undefined) updates.ip = ip;
    if (port !== undefined) updates.port = port;
    if (channel !== undefined) updates.channel = channel;

    const updated = discoveryService.updateCamera(req.params.id, updates);

    if (!updated) {
        throw new AppError(404, 'Camera not found');
    }

    const camera = discoveryService.getCamera(req.params.id);

    res.json({
        success: true,
        message: 'Camera updated',
        camera
    });
});

export default router;
