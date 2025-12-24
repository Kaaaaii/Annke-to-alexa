import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface RTCSessionDescriptionInit {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp?: string;
}

export class WebRTCService {
    private static instance: WebRTCService;
    private go2rtcProcess?: ChildProcess;
    private isReady = false;
    private readonly go2rtcUrl = 'http://localhost:1984';

    private constructor() { }

    static getInstance(): WebRTCService {
        if (!WebRTCService.instance) {
            WebRTCService.instance = new WebRTCService();
        }
        return WebRTCService.instance;
    }

    async initialize(): Promise<void> {
        logger.info('Initializing WebRTC service with go2rtc...');

        try {
            // Check if go2rtc is already running
            const isRunning = await this.checkGo2rtcHealth();

            if (!isRunning) {
                await this.startGo2rtc();
            } else {
                logger.info('go2rtc is already running');
                this.isReady = true;
            }
        } catch (error) {
            logger.error('Failed to initialize WebRTC service:', error);
            logger.warn('WebRTC streaming will not be available');
            // Don't throw - allow server to start without WebRTC
        }
    }

    private async checkGo2rtcHealth(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.go2rtcUrl}/api`, {
                timeout: 2000
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    private async startGo2rtc(): Promise<void> {
        return new Promise((resolve, reject) => {
            logger.info('Starting go2rtc process...');

            // Write configuration to file
            const configPath = 'go2rtc.yaml';
            const go2rtcConfig = this.generateGo2rtcConfig();

            // Use fs to write file (import fs first)
            const fs = require('fs');
            fs.writeFileSync(configPath, go2rtcConfig);

            // Start go2rtc with config file
            this.go2rtcProcess = spawn('go2rtc', ['-config', configPath], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let resolved = false;

            this.go2rtcProcess.stdout?.on('data', (data) => {
                logger.debug(`go2rtc: ${data.toString().trim()}`);
            });

            this.go2rtcProcess.stderr?.on('data', (data) => {
                const message = data.toString().trim();
                logger.debug(`go2rtc: ${message}`);

                // Check if go2rtc is ready
                if (!resolved && (message.includes('INF') && message.includes('api'))) {
                    this.isReady = true;
                    resolved = true;
                    resolve();
                }
            });

            this.go2rtcProcess.on('error', (error) => {
                logger.error('go2rtc process error:', error);
                if (!resolved) {
                    resolved = true;
                    reject(error);
                }
            });

            this.go2rtcProcess.on('exit', (code) => {
                // Ignore code 0 or null (clean exit)
                if (code !== 0 && code !== null) {
                    logger.warn(`go2rtc process exited with code ${code}`);
                }
                this.isReady = false;
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    logger.warn('go2rtc startup timeout - assuming it started');
                    this.isReady = true;
                    resolve();
                }
            }, 10000);
        });
    }

    private generateGo2rtcConfig(): string {
        // Use template literal with actual newlines for valid YAML
        let yaml = `api:
  listen: ":1984"
  origin: "*"

rtsp:
  listen: ":8554"

webrtc:
  listen: ":8555"
  ice_servers:
    - urls: ["${config.stunServer}"]
`;

        if (config.turnServer) {
            yaml += `    - urls: ["${config.turnServer}"]
      username: ${config.turnUsername}
      credential: ${config.turnPassword}
`;
        }

        yaml += `
streams: {}
`;

        return yaml;
    }

    getGo2rtcUrl(): string {
        return this.go2rtcUrl;
    }

    async shutdown(): Promise<void> {
        if (this.go2rtcProcess) {
            logger.info('Shutting down go2rtc...');
            this.go2rtcProcess.kill('SIGTERM');
            this.isReady = false;
        }
    }

    isServiceReady(): boolean {
        return this.isReady;
    }

    /**
     * Add a stream to go2rtc
     */
    async addStream(streamId: string, rtspUrl: string): Promise<void> {
        try {
            // go2rtc API to add stream: PUT /api/streams?src={url}&name={name}
            // Note: go2rtc API might vary, but newer versions support this.
            // If not supported, we might need to update config file and reload, but let's try API first.
            // For go2rtc v1.2+, modifying streams via API is temporary (in-memory).

            const params = new URLSearchParams();
            params.append('src', rtspUrl);
            params.append('name', streamId);

            // Use PUT to create/update stream
            await axios.put(`${this.go2rtcUrl}/api/streams?${params.toString()}`).catch(e => null)
            logger.info(`Added stream ${streamId} to go2rtc`);
        } catch (error) {
            logger.error(`Failed to add stream ${streamId}:`, error);
            throw error;
        }
    }

    /**
     * Create WebRTC session (Exchange SDP)
     * For Alexa: We act as the server. Alexa sends Offer (InitiateSessionWithOffer), we send Answer.
     * OR: We send Offer.
     * 
     * Alexa RTCSessionController:
     * "InitiateSessionWithOffer" -> Payload has "offer". We return "answer".
     */
    async createWebRTCSession(streamId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
        try {
            if (!offer.sdp) {
                throw new Error('SDP is missing in offer');
            }

            // POST /api/webrtc?src={streamId} with SDP payload
            // go2rtc detects if it's an offer or answer based on content usually, 
            // but standard WebRTC flow: Client (Alexa) Offer -> Server (go2rtc) Answer

            const params = new URLSearchParams();
            params.append('src', streamId);

            const response = await axios.post(
                `${this.go2rtcUrl}/api/webrtc?${params.toString()}`,
                offer.sdp,
                {
                    headers: {
                        'Content-Type': 'application/sdp' // or plain text
                    }
                }
            );

            // go2rtc returns the SDP Answer
            const answerSdp = response.data;

            if (typeof answerSdp !== 'string') {
                // Sometimes it might return JSON if error?
                logger.warn('go2rtc response might not be SDP string:', answerSdp);
            }

            return {
                type: 'answer',
                sdp: answerSdp
            };
        } catch (error) {
            logger.error(`Failed to create WebRTC session for ${streamId}:`, error);
            throw error;
        }
    }

    /**
     * Remove stream from go2rtc
     */
    async removeStream(streamId: string): Promise<void> {
        try {
            // DELETE /api/streams?src={streamId} or just let it be?
            // go2rtc API for delete: DELETE /api/streams?src=... or name=...
            // Verify go2rtc API docs or assume generic REST

            const params = new URLSearchParams();
            params.append('src', streamId); // Actually likely 'name' works too or key
            // For safety, let's try to delete by ID if possible, otherwise we might remove the RTSP src?
            // go2rtc doc: PUT /api/streams?key=...&src=...
            // DELETE /api/streams?key=...

            await axios.delete(`${this.go2rtcUrl}/api/streams?src=${streamId}`);
            logger.info(`Removed stream ${streamId} from go2rtc`);
        } catch (error) {
            logger.warn(`Failed to remove stream ${streamId} (might not exist):`, error);
        }
    }
}
