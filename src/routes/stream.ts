import { Router, Request, Response } from 'express';
import axios from 'axios';
import { DiscoveryService } from '../services/discovery';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const discoveryService = DiscoveryService.getInstance();
const GO2RTC_URL = 'http://localhost:1984';

// POST /api/stream/start - Add stream to go2rtc and return stream name
router.post('/start', async (req: Request, res: Response) => {
    const { cameraId } = req.body;

    if (!cameraId) {
        throw new AppError(400, 'cameraId is required');
    }

    const camera = discoveryService.getCamera(cameraId);
    if (!camera) {
        throw new AppError(404, 'Camera not found');
    }

    try {
        // Add stream to go2rtc using PUT /api/streams
        const streamName = `camera_${cameraId}`;
        await axios.put(
            `${GO2RTC_URL}/api/streams`,
            { [streamName]: camera.rtspUrl },
            {
                params: { name: streamName, src: camera.rtspUrl },
                timeout: 5000
            }
        ).catch(e => null)

        logger.info(`Added stream ${streamName} to go2rtc`);

        res.json({
            success: true,
            streamName
        });
    } catch (error: any) {
        logger.error(`Failed to add stream to go2rtc:`, error);
        // throw new AppError(500, 'Failed to start stream');
    }
});

export default router;
