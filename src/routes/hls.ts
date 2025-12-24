import express from 'express';
import { WebRTCService } from '../services/webrtc';

const router = express.Router();
const streamingService = WebRTCService.getInstance();

// Serve HLS playlist and segments
router.get('/:streamId/:file', (req, res) => {
    const { streamId, file } = req.params;
    const hlsDir = streamingService.getHLSDirectory();
    const filePath = `${hlsDir}/${streamId}/${file}`;

    // Set appropriate headers
    if (file.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache');
    } else if (file.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Cache-Control', 'public, max-age=1');
    }

    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send('Stream not found');
        }
    });
});

export default router;
