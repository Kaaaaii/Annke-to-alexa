import { Router, Request, Response } from 'express';
import { DiscoveryService } from '../services/discovery';
import { WebRTCService } from '../services/webrtc';
import { generateToken } from '../middleware/auth';
import { config } from '../config';
import { AlexaDiscoveryEndpoint, AlexaCapability } from '../types';
import { logger } from '../utils/logger';

const router = Router();
const discoveryService = DiscoveryService.getInstance();
const webrtcService = WebRTCService.getInstance();

// Alexa Smart Home Discovery
// Alexa Smart Home Skill Entry Point
router.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Alexa endpoint is active. Use POST for directives.' });
});

router.post('/', async (req: Request, res: Response) => {
    // Normalization: specific Alexa versions (v2) or test events might invoke without 'directive' wrapper
    const directive = req.body.directive || req.body;
    const header = directive?.header;
    const namespace = header?.namespace;
    const name = header?.name;

    console.log(req.body);
    logger.info(`Received Alexa Directive: ${namespace}::${name}`);

    try {
        if (namespace === 'Alexa.Discovery' && name === 'Discover') {
            await handleDiscovery(req, res);
        } else if (namespace === 'Alexa.ConnectedHome.Discovery' && name === 'DiscoverAppliancesRequest') {
            // Handle Legacy v2 Discovery (often used in AWS Lambda Test templates)
            await handleLegacyDiscovery(req, res);
        } else if (namespace === 'Alexa.RTCSessionController' && name === 'InitiateSessionWithOffer') {
            await handleInitiateSessionWithOffer(req, res);
        } else if (namespace === 'Alexa.RTCSessionController' && name === 'SessionDisconnected') {
            await handleSessionDisconnected(req, res);
        } else if (namespace === 'Alexa' && name === 'ReportState') {
            // Optional: Handle state reporting
            res.json(createErrorResponse(header, 'INVALID_DIRECTIVE', 'Not implemented'));
        } else {
            res.json(createErrorResponse(header, 'INVALID_DIRECTIVE', `Unknown directive ${namespace}::${name}`));
        }
    } catch (error) {
        logger.error('Error handling Alexa directive:', error);
        res.json(createErrorResponse(header, 'INTERNAL_ERROR', error instanceof Error ? error.message : 'Unknown error'));
    }
});

// Deprecated old routes - keeping for now but redirected logic above specific to what was asked
// ... actually I should remove them to be clean

async function handleDiscovery(req: Request, res: Response) {
    const cameras = discoveryService.getCameras();
    const endpoints: AlexaDiscoveryEndpoint[] = cameras.map(camera => ({
        endpointId: camera.id,
        manufacturerName: camera.manufacturer || 'Annke',
        friendlyName: camera.name,
        description: `Smart Camera ${camera.channel}`,
        displayCategories: ['CAMERA'],
        capabilities: [
            {
                type: 'AlexaInterface',
                interface: 'Alexa.RTCSessionController',
                version: '3',
                configuration: {
                    isFullDuplexAudioSupported: false
                }
            },
            {
                type: 'AlexaInterface',
                interface: 'Alexa.EndpointHealth',
                version: '3',
                properties: {
                    supported: [{ name: 'connectivity' }],
                    proactivelyReported: true,
                    retrievable: true
                }
            },
            {
                type: 'AlexaInterface',
                interface: 'Alexa',
                version: '3'
            }
        ]
    }));

    res.json({
        event: {
            header: {
                namespace: 'Alexa.Discovery',
                name: 'Discover.Response',
                payloadVersion: '3',
                messageId: req.body.directive.header.messageId || crypto.randomUUID()
            },
            payload: {
                endpoints
            }
        }
    });
}


// Legacy v2 Discovery Handler
async function handleLegacyDiscovery(req: Request, res: Response) {
    logger.warn('Received Legacy v2 Discovery Request. Converting to v2 response...');
    const cameras = discoveryService.getCameras();

    // v2 Appliance Format
    const appliances = cameras.map(camera => ({
        applianceId: camera.id,
        manufacturerName: camera.manufacturer || 'Annke',
        modelName: camera.model || 'Security Camera',
        version: '1.0',
        friendlyName: camera.name,
        friendlyDescription: `Smart Camera ${camera.channel}`,
        isReachable: true,
        actions: [
            "turnOn", "turnOff" // Dummy actions just to show it works
        ],
        additionalApplianceDetails: {
            conf: "legacy"
        }
    }));

    res.json({
        header: {
            messageId: crypto.randomUUID(),
            name: "DiscoverAppliancesResponse",
            namespace: "Alexa.ConnectedHome.Discovery",
            payloadVersion: "2"
        },
        payload: {
            discoveredAppliances: appliances
        }
    });
}

async function handleInitiateSessionWithOffer(req: Request, res: Response) {
    // Normalization
    const body = req.body.directive || req.body;
    const directive = body; // For v3 it's the directive object itself or inside? 
    // If req.body.directive existed, 'directive' var in main handler is correct.
    // If req.body IS the directive (unwrapped), we use that.

    const endpointId = directive.endpoint?.endpointId;
    const offer = directive.payload?.offer;
    const sessionId = directive.payload?.sessionId;

    if (!endpointId || !offer) {
        throw new Error('Missing endpointId or offer');
    }

    const camera = discoveryService.getCamera(endpointId);
    if (!camera) {
        throw new Error(`Camera ${endpointId} not found`);
    }

    // Ensure stream is in go2rtc
    await webrtcService.addStream(endpointId, camera.rtspUrl);

    // Get Answer from go2rtc
    // go2rtc API expects just the SDP string usually, or object?
    // My updated service method expects RTCSessionDescriptionInit

    // offer.value is the SDP string
    const answer = await webrtcService.createWebRTCSession(endpointId, {
        type: 'offer',
        sdp: offer.value
    });

    res.json({
        event: {
            header: {
                namespace: 'Alexa.RTCSessionController',
                name: 'AnswerGeneratedForSession',
                payloadVersion: '3',
                messageId: crypto.randomUUID(),
                correlationToken: directive.header.correlationToken
            },
            endpoint: {
                endpointId
            },
            payload: {
                answer: {
                    format: 'SDP',
                    value: answer.sdp
                },
                sessionId: sessionId // Echo back the session ID provided by Alexa
            }
        }
    });
}

async function handleSessionDisconnected(req: Request, res: Response) {
    const directive = req.body.directive;
    const endpointId = directive.endpoint.endpointId;
    // const sessionId = directive.payload.sessionId;

    // Optional: cleanup stream if no other viewers?
    // For now just ack

    res.json({
        event: {
            header: {
                namespace: 'Alexa',
                name: 'Response',
                payloadVersion: '3',
                messageId: crypto.randomUUID(),
                correlationToken: directive.header.correlationToken
            },
            payload: {}
        }
    });
}

function createErrorResponse(header: any, type: string, message: string) {
    return {
        event: {
            header: {
                namespace: 'Alexa',
                name: 'ErrorResponse',
                payloadVersion: '3',
                messageId: crypto.randomUUID(),
                correlationToken: header?.correlationToken
            },
            payload: {
                type,
                message
            }
        }
    };
}

export default router;
