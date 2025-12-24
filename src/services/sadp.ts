import dgram from 'dgram';
import { networkInterfaces } from 'os';
import { logger } from '../utils/logger';
import { Camera } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SADPScanner {
    private static instance: SADPScanner;
    private socket?: dgram.Socket;
    private readonly SADP_PORT = 37020;
    private readonly SADP_MULTICAST = '239.255.255.250';

    private constructor() { }

    static getInstance(): SADPScanner {
        if (!SADPScanner.instance) {
            SADPScanner.instance = new SADPScanner();
        }
        return SADPScanner.instance;
    }

    /**
     * Scan network using SADP protocol (Hikvision/Annke device discovery)
     */
    async scanSADP(): Promise<Camera[]> {
        return new Promise((resolve) => {
            const discovered: Camera[] = [];
            const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            this.socket = socket;

            // SADP probe message (simplified XML)
            const probeMessage = Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
<Probe>
<Uuid>00000000-0000-0000-0000-000000000000</Uuid>
<Types>inquiry</Types>
</Probe>`);

            socket.on('message', (msg, rinfo) => {
                try {
                    const response = msg.toString();
                    logger.debug(`SADP response from ${rinfo.address}:`, response);

                    // Parse XML response (simplified - in production use proper XML parser)
                    if (response.includes('<ProbeMatch>')) {
                        const ip = rinfo.address;
                        const deviceType = this.extractXMLValue(response, 'DeviceType') || 'Unknown';
                        const deviceName = this.extractXMLValue(response, 'DeviceName') || `Device ${ip}`;
                        const manufacturer = this.extractXMLValue(response, 'Manufacturer') || 'Annke';
                        const model = this.extractXMLValue(response, 'Model') || deviceType;

                        // Check if it's an Annke/Hikvision device
                        if (manufacturer.toLowerCase().includes('hikvision') ||
                            manufacturer.toLowerCase().includes('annke') ||
                            deviceType.toLowerCase().includes('nvr') ||
                            deviceType.toLowerCase().includes('dvr')) {

                            const camera: Camera = {
                                id: uuidv4(),
                                name: deviceName,
                                rtspUrl: `rtsp://admin:@${ip}:554/Streaming/Channels/101`,
                                manufacturer,
                                model,
                                ip,
                                port: 554,
                                channel: 1,
                                status: 'online',
                                lastSeen: new Date()
                            };

                            discovered.push(camera);
                            logger.info(`Found SADP device: ${deviceName} at ${ip}`);
                        }
                    }
                } catch (error) {
                    logger.debug('Error parsing SADP response:', error);
                }
            });

            socket.on('error', (err) => {
                logger.error('SADP socket error:', err);
                socket.close();
                resolve(discovered);
            });

            socket.bind(this.SADP_PORT, () => {
                socket.setBroadcast(true);
                socket.setMulticastTTL(128);
                socket.addMembership(this.SADP_MULTICAST);

                // Send probe to multicast address
                socket.send(probeMessage, this.SADP_PORT, this.SADP_MULTICAST, (err) => {
                    if (err) {
                        logger.error('Failed to send SADP probe:', err);
                    } else {
                        logger.info('SADP probe sent');
                    }
                });

                // Also broadcast to local network
                const localIPs = this.getLocalNetworkBroadcasts();
                localIPs.forEach(broadcastIP => {
                    socket.send(probeMessage, this.SADP_PORT, broadcastIP);
                });
            });

            // Wait 5 seconds for responses
            setTimeout(() => {
                socket.close();
                resolve(discovered);
            }, 5000);
        });
    }

    /**
   * Scan subnet for devices (192.168.1.0/24)
   * Only adds devices that look like cameras/DVRs
   */
    async scanSubnet(subnet: string = '192.168.1'): Promise<Camera[]> {
        logger.info(`Scanning subnet ${subnet}.0/24 for Annke devices...`);
        const discovered: Camera[] = [];
        const promises: Promise<void>[] = [];

        // Scan all IPs in subnet (1-254)
        for (let i = 1; i <= 254; i++) {
            const ip = `${subnet}.${i}`;
            promises.push(this.probeIP(ip, discovered));
        }

        await Promise.all(promises);
        logger.info(`Subnet scan complete. Found ${discovered.length} devices`);
        return discovered;
    }

    private async probeIP(ip: string, discovered: Camera[]): Promise<void> {
        try {
            // Check all three Annke-specific ports: 80 (HTTP), 554 (RTSP), 8000 (SDK)
            const [httpOpen, rtspOpen, sdkOpen] = await Promise.all([
                this.testPort(ip, 80, 300),
                this.testPort(ip, 554, 300),
                this.testPort(ip, 8000, 300)
            ]);

            // Annke DVRs should have all three ports open
            if (httpOpen && rtspOpen && sdkOpen) {
                logger.info(`Found Annke DVR at ${ip} - will prompt for credentials`);

                // Add a placeholder entry to indicate DVR found
                // The dashboard will show a setup modal for this
                discovered.push({
                    id: uuidv4(),
                    name: `Annke DVR ${ip} (Setup Required)`,
                    rtspUrl: `rtsp://admin:@${ip}:554/Streaming/Channels/101`,
                    manufacturer: 'Annke',
                    model: 'Network DVR - Needs Setup',
                    ip,
                    port: 554,
                    channel: 0, // 0 indicates DVR needs setup
                    status: 'offline',
                    lastSeen: new Date()
                });
            } else if (httpOpen && rtspOpen) {
                // Has HTTP and RTSP but not SDK port - might be a standalone camera
                discovered.push({
                    id: uuidv4(),
                    name: `Camera ${ip}`,
                    rtspUrl: `rtsp://admin:@${ip}:554/Streaming/Channels/101`,
                    manufacturer: 'Unknown',
                    model: 'IP Camera',
                    ip,
                    port: 554,
                    channel: 1,
                    status: 'online',
                    lastSeen: new Date()
                });
                logger.info(`Found IP Camera at ${ip} (ports 80, 554 open)`);
            }
        } catch (error) {
            // Ignore errors, just means device not found
        }
    }

    /**
     * Probe a specific channel on an Annke DVR
     * Channels use pattern: 101, 201, 301, 401, etc.
     */
    private async probeChannel(ip: string, channel: number): Promise<Camera | null> {
        try {
            // Annke uses channel format: X01 where X is the channel number
            const channelId = `${channel}01`;
            const rtspUrl = `rtsp://admin:@${ip}:554/Streaming/Channels/${channelId}`;

            // For now, assume all channels exist (actual RTSP probe would require ffprobe)
            // In production, you'd verify the stream is actually available
            return {
                id: uuidv4(),
                name: `Annke Camera ${channel}`,
                rtspUrl,
                manufacturer: 'Annke',
                model: 'DVR Channel',
                ip,
                port: 554,
                channel,
                status: 'online',
                lastSeen: new Date()
            };
        } catch (error) {
            return null;
        }
    }

    private testPort(ip: string, port: number, timeout: number): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new (require('net').Socket)();
            let resolved = false;

            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                    socket.destroy();
                }
            };

            socket.setTimeout(timeout);
            socket.on('connect', () => {
                cleanup();
                resolve(true);
            });
            socket.on('timeout', () => {
                cleanup();
                resolve(false);
            });
            socket.on('error', () => {
                cleanup();
                resolve(false);
            });

            socket.connect(port, ip);
        });
    }

    private getLocalNetworkBroadcasts(): string[] {
        const broadcasts: string[] = [];
        const interfaces = networkInterfaces();

        for (const name of Object.keys(interfaces)) {
            const iface = interfaces[name];
            if (!iface) continue;

            for (const addr of iface) {
                if (addr.family === 'IPv4' && !addr.internal) {
                    // Calculate broadcast address from IP and netmask
                    const ipParts = addr.address.split('.').map(Number);
                    const maskParts = addr.netmask.split('.').map(Number);
                    const broadcast = ipParts.map((part, i) =>
                        part | (~maskParts[i] & 255)
                    ).join('.');
                    broadcasts.push(broadcast);
                }
            }
        }

        return broadcasts;
    }

    private extractXMLValue(xml: string, tag: string): string | null {
        const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i');
        const match = xml.match(regex);
        return match ? match[1] : null;
    }

    stop(): void {
        if (this.socket) {
            this.socket.close();
            this.socket = undefined;
        }
    }
}
