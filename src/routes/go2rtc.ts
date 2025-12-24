import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = express.Router();

// Proxy all go2rtc requests through Express (including WebSocket)
router.use('/', createProxyMiddleware({
    target: 'http://localhost:1984',
    changeOrigin: true,
    ws: true,
    pathRewrite: {
        '^/go2rtc': ''
    },
    // IMPORTANT: Spoof localhost to bypass go2rtc authentication
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.removeHeader('x-forwarded-for');
        proxyReq.removeHeader('x-forwarded-proto');
        proxyReq.removeHeader('x-forwarded-host');

        //console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:1984${req.url.replace('/go2rtc', '')}`);
    },
    onProxyReqWs: (proxyReq, req, socket, options, head) => {
        proxyReq.removeHeader('x-forwarded-for');
        proxyReq.removeHeader('x-forwarded-proto');
        proxyReq.removeHeader('x-forwarded-host');
        console.log('[Proxy] WebSocket connection');
    },
    onError: (err: any, req: any, res: any) => {
        console.error('Proxy error:', err);
        if (res.writeHead) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'WebRTC service unavailable' }));
        }
    }
}));

export default router;
