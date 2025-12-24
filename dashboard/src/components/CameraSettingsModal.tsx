import { useState, useEffect } from 'react';
import { type Camera } from '../api';
import './CameraSettingsModal.css';

interface CameraSettingsModalProps {
    camera: Camera;
    onClose: () => void;
    onSave: (cameraId: string, updates: Partial<Camera>) => Promise<void>;
}

export default function CameraSettingsModal({ camera, onClose, onSave }: CameraSettingsModalProps) {
    const [formData, setFormData] = useState({
        name: camera.name,
        rtspUrl: camera.rtspUrl,
        ip: camera.ip,
        port: camera.port,
        channel: camera.channel,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleChange = (field: string, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.name.trim()) {
            setError('Camera name is required');
            return;
        }
        if (!formData.rtspUrl.trim()) {
            setError('RTSP URL is required');
            return;
        }
        if (!formData.ip.trim()) {
            setError('IP address is required');
            return;
        }
        if (formData.port < 1 || formData.port > 65535) {
            setError('Port must be between 1 and 65535');
            return;
        }
        if (formData.channel < 1) {
            setError('Channel must be at least 1');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave(camera.id, formData);
            onClose();
        } catch (err) {
            setError('Failed to save camera settings. Please try again.');
            console.error('Failed to save camera settings:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content camera-settings-modal">
                <div className="modal-header">
                    <h2>⚙️ Camera Settings</h2>
                    <button className="close-btn" onClick={onClose} title="Close">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div className="error-message">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="camera-name">
                                Camera Name <span className="required">*</span>
                            </label>
                            <input
                                id="camera-name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g., Front Door Camera"
                                disabled={saving}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="rtsp-url">
                                RTSP URL <span className="required">*</span>
                            </label>
                            <input
                                id="rtsp-url"
                                type="text"
                                value={formData.rtspUrl}
                                onChange={(e) => handleChange('rtspUrl', e.target.value)}
                                placeholder="rtsp://username:password@ip:port/stream"
                                disabled={saving}
                            />
                            <small className="form-hint">
                                Full RTSP stream URL including credentials
                            </small>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="camera-ip">
                                    IP Address <span className="required">*</span>
                                </label>
                                <input
                                    id="camera-ip"
                                    type="text"
                                    value={formData.ip}
                                    onChange={(e) => handleChange('ip', e.target.value)}
                                    placeholder="192.168.1.100"
                                    disabled={saving}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="camera-port">
                                    Port <span className="required">*</span>
                                </label>
                                <input
                                    id="camera-port"
                                    type="number"
                                    value={formData.port}
                                    onChange={(e) => handleChange('port', parseInt(e.target.value) || 0)}
                                    placeholder="554"
                                    min="1"
                                    max="65535"
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="camera-channel">
                                Channel <span className="required">*</span>
                            </label>
                            <input
                                id="camera-channel"
                                type="number"
                                value={formData.channel}
                                onChange={(e) => handleChange('channel', parseInt(e.target.value) || 0)}
                                placeholder="1"
                                min="1"
                                disabled={saving}
                            />
                            <small className="form-hint">
                                DVR/NVR channel number
                            </small>
                        </div>

                        <div className="info-section">
                            <h4>📊 Camera Information</h4>
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Manufacturer:</span>
                                    <span className="info-value">{camera.manufacturer || 'Unknown'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Model:</span>
                                    <span className="info-value">{camera.model || 'Unknown'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Status:</span>
                                    <span className={`info-value status-${camera.status}`}>
                                        {camera.status}
                                    </span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Last Seen:</span>
                                    <span className="info-value">
                                        {new Date(camera.lastSeen).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                        >
                            {saving ? '💾 Saving...' : '💾 Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
