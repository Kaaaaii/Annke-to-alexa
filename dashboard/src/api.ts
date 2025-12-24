import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

export interface Camera {
    id: string;
    name: string;
    rtspUrl: string;
    manufacturer?: string;
    model?: string;
    ip: string;
    port: number;
    channel: number;
    status: 'online' | 'offline' | 'unknown';
    lastSeen: string;
}

export interface Config {
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
    alexa?: {
        clientId?: string;
        clientSecret?: string;
        redirectUri?: string;
    };
    discovery?: {
        autoDiscover: boolean;
        interval: number;
        maxCameras: number;
    };
    setupCompleted?: boolean;
}

export async function checkSetupStatus(): Promise<boolean> {
    const response = await api.get('/config/setup-status');
    return response.data.setupCompleted || false;
}

export async function getConfig(): Promise<Config> {
    const response = await api.get('/config');
    return response.data.config;
}

export async function saveConfig(config: Config): Promise<void> {
    await api.post('/config', config);
}

export async function getCameras(): Promise<Camera[]> {
    const response = await api.get('/cameras');
    return response.data.cameras;
}

export async function triggerDiscovery(): Promise<void> {
    await api.post('/cameras/discover');
}

export async function getToken(cameraId: string): Promise<string> {
    const response = await api.get(`/webrtc/token?cameraId=${cameraId}`);
    return response.data.token;
}

export async function getStatus(): Promise<any> {
    const response = await api.get('/webrtc/status');
    return response.data.status;
}
