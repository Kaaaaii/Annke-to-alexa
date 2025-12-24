import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { SignalingMessage } from '../types';
import { WebRTCService } from './webrtc';
import { DiscoveryService } from './discovery';

interface Client {
    id: string;
    ws: WebSocket;
    cameraId?: string;
    authenticated: boolean;
}

export function setupWebSocketServer(wss: WebSocketServer): void {
    const clients = new Map<string, Client>();
    const webrtcService = WebRTCService.getInstance();
    const discoveryService = DiscoveryService.getInstance();

    logger.info('WebSocket signaling server initialized');

    wss.on('connection', (ws: WebSocket, req) => {
        const clientId = uuidv4();
        const client: Client = {
            id: clientId,
            ws,
            authenticated: false
        };

        clients.set(clientId, client);
        logger.info(`Client connected: ${clientId}`);

        // Extract token from query string
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (token) {
            try {
                const decoded = jwt.verify(token, config.jwtSecret) as { cameraId: string };
                client.authenticated = true;
                client.cameraId = decoded.cameraId;
                logger.info(`Client ${clientId} authenticated for camera ${decoded.cameraId}`);
            } catch (error) {
                logger.warn(`Client ${clientId} authentication failed:`, error);
                ws.close(1008, 'Authentication failed');
                clients.delete(clientId);
                return;
            }
        }

        ws.on('message', async (data: Buffer) => {
            try {
                const message: SignalingMessage = JSON.parse(data.toString());

                if (!client.authenticated) {
                    ws.send(JSON.stringify({ error: 'Not authenticated' }));
                    return;
                }

                await handleSignalingMessage(client, message);
            } catch (error) {
                logger.error(`Error handling message from ${clientId}:`, error);
                ws.send(JSON.stringify({ error: 'Invalid message format' }));
            }
        });

        ws.on('close', () => {
            logger.info(`Client disconnected: ${clientId}`);
            clients.delete(clientId);
        });

        ws.on('error', (error) => {
            logger.error(`WebSocket error for client ${clientId}:`, error);
        });

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'welcome',
            clientId,
            authenticated: client.authenticated
        }));
    });

    async function handleSignalingMessage(client: Client, message: SignalingMessage): Promise<void> {
        const { type, cameraId } = message;

        // Verify client is authorized for this camera
        if (client.cameraId && client.cameraId !== cameraId) {
            client.ws.send(JSON.stringify({ error: 'Unauthorized for this camera' }));
            return;
        }

        const camera = discoveryService.getCamera(cameraId);
        if (!camera) {
            client.ws.send(JSON.stringify({ error: 'Camera not found' }));
            return;
        }

        try {
            switch (type) {
                case 'start-stream':
                    // Start HLS stream
                    const hlsUrl = await webrtcService.startStream(cameraId, camera.rtspUrl);

                    // Send HLS URL back to client
                    client.ws.send(JSON.stringify({
                        type: 'stream-ready',
                        cameraId,
                        hlsUrl
                    }));

                    logger.info(`HLS stream started for camera ${cameraId}`);
                    break;

                case 'ice-candidate':
                    // ICE candidates are typically handled by go2rtc
                    logger.debug(`ICE candidate received for camera ${cameraId}`);
                    break;

                default:
                    logger.warn(`Unknown signaling message type: ${type}`);
            }
        } catch (error) {
            logger.error(`Error processing ${type} for camera ${cameraId}:`, error);
            client.ws.send(JSON.stringify({
                error: `Failed to process ${type}`,
                details: error instanceof Error ? error.message : 'Unknown error'
            }));
        }
    }

    // Cleanup on server shutdown
    wss.on('close', () => {
        logger.info('WebSocket server closing, disconnecting all clients...');
        clients.forEach((client) => {
            client.ws.close(1001, 'Server shutting down');
        });
        clients.clear();
    });
}
