import { useState, useEffect } from 'react';
import { getToken, type Camera } from '../api';
import WebRTCPlayer from './WebRTCPlayer';
import './GridViewModal.css';

interface GridViewModalProps {
    cameras: Camera[];
    onClose: () => void;
}

export default function GridViewModal({ cameras, onClose }: GridViewModalProps) {
    const [tokens, setTokens] = useState<Map<string, string>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        async function loadTokens() {
            const newTokens = new Map<string, string>();

            // Load tokens for up to 16 cameras (4x4 grid)
            const camerasToShow = cameras.slice(0, 16);

            for (const camera of camerasToShow) {
                try {
                    const token = await getToken(camera.id);
                    newTokens.set(camera.id, token);
                } catch (error) {
                    console.error(`Failed to get token for camera ${camera.id}:`, error);
                }
            }

            setTokens(newTokens);
            setLoading(false);
        }

        loadTokens();
    }, [cameras]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const camerasToDisplay = cameras.slice(0, 16);

    return (
        <div className="grid-view-modal" onClick={handleBackdropClick}>
            <div className="grid-view-container">
                <div className="grid-view-header">
                    <h2>📹 Camera Grid View</h2>
                    <button className="close-btn" onClick={onClose} title="Close">
                        ✕
                    </button>
                </div>

                {loading ? (
                    <div className="grid-loading">
                        <div className="spinner"></div>
                        <p>Loading camera streams...</p>
                    </div>
                ) : (
                    <div className="camera-grid-4x4">
                        {camerasToDisplay.map((camera) => (
                            <div key={camera.id} className="grid-cell">
                                <div className="grid-cell-header">
                                    <span className="grid-cell-name">{camera.name}</span>
                                    <span className={`grid-cell-status status-${camera.status}`}>
                                        ●
                                    </span>
                                </div>
                                <div className="grid-cell-video">
                                    {tokens.has(camera.id) ? (
                                        <WebRTCPlayer
                                            cameraId={camera.id}
                                            rtspUrl={camera.rtspUrl}
                                            token={tokens.get(camera.id)!}
                                        />
                                    ) : (
                                        <div className="grid-cell-placeholder">
                                            <div className="placeholder-icon">📹</div>
                                            <p>Failed to load</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Fill empty cells if less than 16 cameras */}
                        {Array.from({ length: 16 - camerasToDisplay.length }).map((_, index) => (
                            <div key={`empty-${index}`} className="grid-cell grid-cell-empty">
                                <div className="grid-cell-placeholder">
                                    <div className="placeholder-icon">📹</div>
                                    <p>No camera</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
