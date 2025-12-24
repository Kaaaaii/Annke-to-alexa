import { useState } from 'react';
import './AddCameraModal.css';

interface AddCameraModalProps {
    onClose: () => void;
    onAdd: (camera: {
        name: string;
        rtspUrl: string;
        ip: string;
        port: number;
        channel: number;
    }) => void;
}

export default function AddCameraModal({ onClose, onAdd }: AddCameraModalProps) {
    const [name, setName] = useState('');
    const [ip, setIp] = useState('');
    const [port, setPort] = useState(554);
    const [channel, setChannel] = useState(1);
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    const [urlPattern, setUrlPattern] = useState('hikvision');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Build RTSP URL based on pattern
        let rtspUrl = '';
        switch (urlPattern) {
            case 'hikvision':
                rtspUrl = `rtsp://${username}:${password}@${ip}:${port}/Streaming/Channels/${channel}01`;
                break;
            case 'dahua':
                rtspUrl = `rtsp://${username}:${password}@${ip}:${port}/cam/realmonitor?channel=${channel}&subtype=0`;
                break;
            case 'generic':
                rtspUrl = `rtsp://${username}:${password}@${ip}:${port}/stream${channel}`;
                break;
            case 'custom':
                rtspUrl = `rtsp://${username}:${password}@${ip}:${port}/`;
                break;
        }

        onAdd({
            name: name || `Camera ${ip}`,
            rtspUrl,
            ip,
            port,
            channel
        });

        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>➕ Add Camera Manually</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Camera Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Living Room Camera"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>IP Address *</label>
                            <input
                                type="text"
                                value={ip}
                                onChange={(e) => setIp(e.target.value)}
                                placeholder="192.168.1.100"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Port</label>
                            <input
                                type="number"
                                value={port}
                                onChange={(e) => setPort(parseInt(e.target.value))}
                                min="1"
                                max="65535"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Password *</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Channel</label>
                            <input
                                type="number"
                                value={channel}
                                onChange={(e) => setChannel(parseInt(e.target.value))}
                                min="1"
                                max="32"
                            />
                        </div>

                        <div className="form-group">
                            <label>URL Pattern</label>
                            <select value={urlPattern} onChange={(e) => setUrlPattern(e.target.value)}>
                                <option value="hikvision">Hikvision/Annke</option>
                                <option value="dahua">Dahua</option>
                                <option value="generic">Generic</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                    </div>

                    <div className="info-box">
                        <strong>Preview URL:</strong>
                        <code className="url-preview">
                            {urlPattern === 'custom'
                                ? `rtsp://${username}:***@${ip}:${port}/[your-path]`
                                : urlPattern === 'hikvision'
                                    ? `rtsp://${username}:***@${ip}:${port}/Streaming/Channels/${channel}01`
                                    : urlPattern === 'dahua'
                                        ? `rtsp://${username}:***@${ip}:${port}/cam/realmonitor?channel=${channel}&subtype=0`
                                        : `rtsp://${username}:***@${ip}:${port}/stream${channel}`
                            }
                        </code>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Add Camera
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
