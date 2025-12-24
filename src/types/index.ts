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
    lastSeen: Date;
    capabilities?: string[];
}

export interface DiscoveryResult {
    cameras: Camera[];
    timestamp: Date;
    method: 'onvif' | 'manual' | 'probe' | 'sadp';
}

export interface WebRTCOffer {
    sdp: string;
    type: 'offer';
}

export interface WebRTCAnswer {
    sdp: string;
    type: 'answer';
}

export interface ICECandidate {
    candidate: string;
    sdpMLineIndex?: number;
    sdpMid?: string;
}

export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate';
    cameraId: string;
    payload: WebRTCOffer | WebRTCAnswer | ICECandidate;
}

export interface AlexaDiscoveryEndpoint {
    endpointId: string;
    manufacturerName: string;
    friendlyName: string;
    description: string;
    displayCategories: string[];
    capabilities: AlexaCapability[];
}

export interface AlexaCapability {
    type: string;
    interface: string;
    version: string;
    properties?: {
        supported: Array<{ name: string }>;
        proactivelyReported: boolean;
        retrievable: boolean;
    };
    configuration?: any;
}

export interface RTCSessionConfig {
    sessionId: string;
    offer: WebRTCOffer;
    iceServers: Array<{
        urls: string | string[];
        username?: string;
        credential?: string;
    }>;
}
