import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Camera, DiscoveryResult } from '../types';
import { StorageService } from './storage';

export class DiscoveryService {
    private static instance: DiscoveryService;
    private cameras: Map<string, Camera> = new Map();
    private discoveryInterval?: Timer;
    private storageService: StorageService;

    private constructor() {
        this.storageService = StorageService.getInstance();
        this.loadCamerasFromStorage();
    }

    static getInstance(): DiscoveryService {
        if (!DiscoveryService.instance) {
            DiscoveryService.instance = new DiscoveryService();
        }
        return DiscoveryService.instance;
    }

    /**
     * Load cameras from persistent storage
     */
    private async loadCamerasFromStorage(): Promise<void> {
        try {
            const cameras = await this.storageService.loadCameras();
            cameras.forEach(camera => {
                this.cameras.set(camera.id, camera);
            });
            logger.info(`Loaded ${cameras.length} cameras from persistent storage`);
        } catch (error) {
            logger.error('Failed to load cameras from storage:', error);
        }
    }

    /**
     * Save current cameras to persistent storage
     */
    private async saveCamerasToStorage(): Promise<void> {
        try {
            const cameras = Array.from(this.cameras.values());
            await this.storageService.saveCameras(cameras);
        } catch (error) {
            logger.error('Failed to save cameras to storage:', error);
        }
    }

    async startAutoDiscovery(): Promise<void> {
        logger.info('Starting auto-discovery service...');

        // Initial discovery
        await this.discoverCameras();

        // Set up periodic discovery
        if (config.discoveryInterval > 0) {
            this.discoveryInterval = setInterval(
                () => this.discoverCameras(),
                config.discoveryInterval
            );
            logger.info(`Auto-discovery scheduled every ${config.discoveryInterval}ms`);
        }
    }

    stopAutoDiscovery(): void {
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
            this.discoveryInterval = undefined;
            logger.info('Auto-discovery stopped');
        }
    }

    async discoverCameras(): Promise<DiscoveryResult> {
        logger.info('Starting camera discovery...');
        const startTime = Date.now();

        try {
            const discoveredCameras: Camera[] = [];

            // 1. Try SADP protocol (like SADP Tool)
            logger.info('Starting SADP discovery...');
            const { SADPScanner } = await import('./sadp');
            const sadpScanner = SADPScanner.getInstance();
            const sadpCameras = await sadpScanner.scanSADP();
            discoveredCameras.push(...sadpCameras);
            logger.info(`SADP found ${sadpCameras.length} devices`);

            // 2. Try ONVIF discovery
            const onvifCameras = await this.discoverOnvif();
            discoveredCameras.push(...onvifCameras);

            // 3. If DVR IP is configured, probe standard Annke channels
            if (config.dvrIp) {
                logger.info(`DVR IP configured: ${config.dvrIp}, probing channels...`);
                const probedCameras = await this.probeAnnkeChannels(config.dvrIp);
                discoveredCameras.push(...probedCameras);
            } else {
                logger.info('No DVR IP configured, skipping channel probing');
            }

            // 4. Subnet scan as fallback (if no devices found)
            if (discoveredCameras.length === 0) {
                logger.info('No devices found, trying subnet scan...');
                const subnetCameras = await sadpScanner.scanSubnet('192.168.1');
                discoveredCameras.push(...subnetCameras);
            }

            // Update camera map - prevent duplicates by IP+channel
            for (const camera of discoveredCameras) {
                const existingCamera = Array.from(this.cameras.values()).find(
                    c => c.ip === camera.ip && c.channel === camera.channel
                );

                if (!existingCamera) {
                    this.cameras.set(camera.id, camera);
                    logger.info(`Added new camera: ${camera.name} (${camera.ip}:${camera.channel})`);
                } else {
                    logger.debug(`Camera already exists: ${camera.ip}:${camera.channel}`);
                }
            }

            const duration = Date.now() - startTime;
            logger.info(`Discovery completed in ${duration}ms. Total cameras: ${this.cameras.size}`);

            // Save to persistent storage if new cameras were discovered
            if (discoveredCameras.length > 0) {
                await this.saveCamerasToStorage();
            }

            return {
                cameras: Array.from(this.cameras.values()),
                timestamp: new Date(),
                method: 'sadp'
            };
        } catch (error) {
            logger.error('Discovery failed:', error);
            return {
                cameras: Array.from(this.cameras.values()),
                timestamp: new Date(),
                method: 'sadp'
            };
        }
    }

    private async discoverOnvif(): Promise<Camera[]> {
        return new Promise((resolve) => {
            const discovered: Camera[] = [];

            logger.debug('Starting ONVIF discovery...');

            try {
                // Use node-onvif-ts discovery
                const onvif = require('node-onvif-ts');
                const discovery = new onvif.OnvifServiceDevice();

                discovery.startProbe().then((deviceList: any[]) => {
                    logger.info(`ONVIF discovery found ${deviceList.length} devices`);

                    deviceList.forEach((device: any) => {
                        try {
                            const address = device.urn || device.address || '';
                            const xaddrs = device.xaddrs || [];

                            // Extract IP from xaddrs
                            let ip = '';
                            if (xaddrs.length > 0) {
                                try {
                                    const url = new URL(xaddrs[0]);
                                    ip = url.hostname;
                                } catch {
                                    ip = address;
                                }
                            }

                            if (!ip) return;

                            const camera: Camera = {
                                id: uuidv4(),
                                name: device.name || `Camera ${ip}`,
                                rtspUrl: this.buildRtspUrl(ip, 1),
                                manufacturer: device.manufacturer || 'Unknown',
                                model: device.model || 'Unknown',
                                ip,
                                port: 80,
                                channel: 1,
                                status: 'online',
                                lastSeen: new Date(),
                                capabilities: device.scopes || []
                            };

                            discovered.push(camera);
                        } catch (err) {
                            logger.debug('Error processing ONVIF device:', err);
                        }
                    });

                    resolve(discovered);
                }).catch((error: Error) => {
                    logger.warn('ONVIF discovery error:', error.message);
                    resolve([]);
                });

                // Timeout after 10 seconds
                setTimeout(() => {
                    resolve(discovered);
                }, 10000);
            } catch (error) {
                logger.warn('ONVIF module error:', error);
                resolve([]);
            }
        });
    }

    private async probeAnnkeChannels(dvrIp: string): Promise<Camera[]> {
        logger.info(`Probing Annke DVR channels at ${dvrIp}...`);
        const cameras: Camera[] = [];

        // Annke DVRs typically support 4, 8, or 16 channels
        const maxChannels = Math.min(config.maxCameras, 16);

        for (let channel = 1; channel <= maxChannels; channel++) {
            const rtspUrl = this.buildRtspUrl(dvrIp, channel);

            if (await this.probeRtspStream(rtspUrl)) {
                const camera: Camera = {
                    id: uuidv4(),
                    name: `Annke Camera ${channel}`,
                    rtspUrl,
                    manufacturer: 'Annke',
                    model: 'DVR Channel',
                    ip: dvrIp,
                    port: config.dvrPort,
                    channel,
                    status: 'online',
                    lastSeen: new Date()
                };

                cameras.push(camera);
                logger.info(`Found active camera on channel ${channel}`);
            }
        }

        logger.info(`Probed ${maxChannels} channels, found ${cameras.length} active cameras`);
        return cameras;
    }

    private buildRtspUrl(ip: string, channel: number): string {
        const { dvrUsername, dvrPassword, dvrPort } = config;

        // Common Annke RTSP URL patterns
        const patterns = [
            `rtsp://${dvrUsername}:${dvrPassword}@${ip}:${dvrPort}/Streaming/Channels/${channel}01`,
            `rtsp://${dvrUsername}:${dvrPassword}@${ip}:${dvrPort}/cam/realmonitor?channel=${channel}&subtype=0`,
            `rtsp://${dvrUsername}:${dvrPassword}@${ip}:${dvrPort}/stream${channel}`
        ];

        // Return the first pattern by default
        return patterns[0];
    }

    private async probeRtspStream(rtspUrl: string): Promise<boolean> {
        try {
            // Simple probe - in production, you'd use ffprobe or similar
            // For now, we'll just validate the URL format
            const url = new URL(rtspUrl);
            return url.protocol === 'rtsp:';
        } catch {
            return false;
        }
    }

    getCameras(): Camera[] {
        return Array.from(this.cameras.values());
    }

    getCamera(id: string): Camera | undefined {
        return this.cameras.get(id);
    }

    addCamera(camera: Camera): void {
        this.cameras.set(camera.id, camera);
        logger.info(`Manually added camera: ${camera.name}`);
        this.saveCamerasToStorage(); // Persist to storage
    }

    removeCamera(id: string): boolean {
        const deleted = this.cameras.delete(id);
        if (deleted) {
            logger.info(`Removed camera: ${id}`);
            this.saveCamerasToStorage(); // Persist to storage
        }
        return deleted;
    }

    updateCameraStatus(id: string, status: Camera['status']): void {
        const camera = this.cameras.get(id);
        if (camera) {
            camera.status = status;
            camera.lastSeen = new Date();
        }
    }

    updateCamera(id: string, updates: Partial<Camera>): boolean {
        const camera = this.cameras.get(id);
        if (!camera) {
            return false;
        }

        // Update camera properties
        Object.assign(camera, updates);
        camera.lastSeen = new Date();

        this.cameras.set(id, camera);
        logger.info(`Updated camera: ${camera.name} (${id})`);
        this.saveCamerasToStorage(); // Persist to storage

        return true;
    }
}
