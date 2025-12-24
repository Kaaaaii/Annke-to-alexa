import { useState } from 'react';
import { getToken, type Camera } from '../api';
import WebRTCPlayer from './WebRTCPlayer';
import CameraSettingsModal from './CameraSettingsModal';
import './CameraCard.css';

interface CameraCardProps {
    camera: Camera;
    onDelete?: (cameraId: string) => void;
    onUpdate?: (cameraId: string, updates: Partial<Camera>) => Promise<void>;
}

export default function CameraCard({ camera, onDelete, onUpdate }: CameraCardProps) {
    const [showPlayer, setShowPlayer] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [token, setToken] = useState<string>('');

    const handleView = async () => {
        try {
            const newToken = await getToken(camera.id);
            setToken(newToken);
            setShowPlayer(true);
        } catch (error) {
            console.error('Failed to get token:', error);
        }
    };

    const handleDelete = () => {
        if (confirm(`Delete camera "${camera.name}"?`)) {
            onDelete?.(camera.id);
        }
    };

    const getStatusColor = () => {
        switch (camera.status) {
            case 'online':
                return 'var(--secondary)';
            case 'offline':
                return 'var(--danger)';
            default:
                return 'var(--warning)';
        }
    };

    return (
        <div className="camera-card">
            <div className="camera-header">
                <div className="camera-info">
                    <h3>{camera.name}</h3>
                    <p className="camera-details">
                        {camera.manufacturer} • Channel {camera.channel}
                    </p>
                </div>
                <div className="camera-header-actions">
                    <div
                        className="camera-status"
                        style={{ backgroundColor: getStatusColor() }}
                    >
                        {camera.status}
                    </div>
                    {onDelete && (
                        <button
                            className="delete-btn"
                            onClick={handleDelete}
                            title="Delete camera"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </div>

            <div className="camera-preview">
                {showPlayer && token ? (
                    <WebRTCPlayer
                        cameraId={camera.id}
                        rtspUrl={camera.rtspUrl}
                        token={token}
                    />
                ) : (
                    <div className="preview-placeholder">
                        <div className="preview-icon">📹</div>
                        <p>Click "View Stream" to start</p>
                    </div>
                )}
            </div>

            <div className="camera-meta">
                <div className="meta-item">
                    <span className="meta-label">IP:</span>
                    <span className="meta-value">{camera.ip}</span>
                </div>
                <div className="meta-item">
                    <span className="meta-label">Port:</span>
                    <span className="meta-value">{camera.port}</span>
                </div>
                <div className="meta-item">
                    <span className="meta-label">Model:</span>
                    <span className="meta-value">{camera.model || 'Unknown'}</span>
                </div>
            </div>

            <div className="camera-actions">
                <button
                    className="btn btn-primary btn-sm"
                    onClick={handleView}
                    disabled={camera.status === 'offline'}
                >
                    {showPlayer ? '🔄 Refresh' : '▶️ View Stream'}
                </button>
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowSettings(true)}
                >
                    ⚙️ Settings
                </button>
            </div>

            {showSettings && onUpdate && (
                <CameraSettingsModal
                    camera={camera}
                    onClose={() => setShowSettings(false)}
                    onSave={onUpdate}
                />
            )}
        </div>
    );
}
