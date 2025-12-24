import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './WebRTCPlayer.css';

interface WebRTCPlayerProps {
    cameraId: string;
    rtspUrl: string;
    token: string;
}

export default function WebRTCPlayer({ cameraId, rtspUrl, token }: WebRTCPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState<string>('Connecting...');
    const [error, setError] = useState<string>('');
    const wsRef = useRef<WebSocket | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);

    useEffect(() => {
        let mounted = true;
        let ws: WebSocket | null = null;
        let pc: RTCPeerConnection | null = null;

        async function startStream() {
            try {
                setStatus('Adding stream to go2rtc...');

                // First, add the stream to go2rtc
                const streamResponse = await axios.post('/api/stream/start', { cameraId });
                const streamName = streamResponse.data.streamName;

                // Wait for stream to initialize
                setStatus('Waiting for stream to initialize...');
                await new Promise(resolve => setTimeout(resolve, 1000));

                setStatus('Connecting...');

                // Create RTCPeerConnection (exactly like go2rtc)
                pc = new RTCPeerConnection({
                    iceServers: [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }]
                });
                pcRef.current = pc;

                // Add transceivers for receiving video and audio (exactly like go2rtc)
                const localTracks = ['video', 'audio']
                    .map(kind => pc!.addTransceiver(kind, { direction: 'recvonly' }).receiver.track);

                // Set video source
                if (videoRef.current) {
                    videoRef.current.srcObject = new MediaStream(localTracks);
                }

                // Connect WebSocket (exactly like go2rtc)
                ws = new WebSocket(`ws://localhost:1984/api/ws?src=${streamName}`);
                wsRef.current = ws;

                ws.addEventListener('open', () => {
                    console.log('WebSocket connected');
                    setStatus('WebSocket connected');

                    // Send ICE candidates (exactly like go2rtc)
                    pc!.addEventListener('icecandidate', ev => {
                        if (!ev.candidate) return;
                        const msg = { type: 'webrtc/candidate', value: ev.candidate.candidate };
                        ws!.send(JSON.stringify(msg));
                    });

                    // Create and send offer (exactly like go2rtc)
                    pc!.createOffer().then(offer => pc!.setLocalDescription(offer)).then(() => {
                        const msg = { type: 'webrtc/offer', value: pc!.localDescription?.sdp };
                        ws!.send(JSON.stringify(msg));
                    });
                });

                ws.addEventListener('message', ev => {
                    const msg = JSON.parse(ev.data);
                    if (msg.type === 'webrtc/candidate') {
                        // Receive ICE candidate (exactly like go2rtc)
                        pc!.addIceCandidate({ candidate: msg.value, sdpMid: '0' });
                    } else if (msg.type === 'webrtc/answer') {
                        // Receive answer (exactly like go2rtc)
                        pc!.setRemoteDescription({ type: 'answer', sdp: msg.value });
                        setStatus('Connected!');
                    }
                });

                ws.addEventListener('error', (err) => {
                    console.error('WebSocket error:', err);
                    setError('WebSocket connection failed');
                });

                ws.addEventListener('close', () => {
                    console.log('WebSocket closed');
                    if (mounted) {
                        setStatus('Disconnected');
                    }
                });

            } catch (err) {
                if (!mounted) return;
                setError(err instanceof Error ? err.message : 'Unknown error');
                setStatus('Error');
                console.error('Stream error:', err);
            }
        }

        startStream();

        return () => {
            mounted = false;
            if (ws) {
                ws.close();
            }
            if (pc) {
                pc.close();
            }
        };
    }, [cameraId, rtspUrl, token]);

    return (
        <div className="webrtc-player">
            <video
                ref={videoRef}
                autoPlay
                controls
                playsInline
                muted
                className="video-element"
            />
            <div className="player-overlay">
                <div className={`player-status ${error ? 'error' : ''} ${status === 'Connected!' ? 'connected' : ''}`}>
                    {error || status}
                </div>
            </div>
        </div>
    );
}
