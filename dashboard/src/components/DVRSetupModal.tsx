import { useState } from 'react';
import axios from 'axios';
import './DVRSetupModal.css';

interface DVRSetupModalProps {
    dvrIP: string;
    onComplete: () => void;
    onCancel: () => void;
}

export default function DVRSetupModal({ dvrIP, onComplete, onCancel }: DVRSetupModalProps) {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('');
    const [channelCount, setChannelCount] = useState(4);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Add cameras for each channel
            const promises = [];
            for (let channel = 1; channel <= channelCount; channel++) {
                const channelId = `${channel}01`;
                const rtspUrl = `rtsp://${username}:${password}@${dvrIP}:554/Streaming/Channels/${channelId}`;

                promises.push(
                    axios.post('/api/cameras', {
                        name: `Annke Camera ${channel}`,
                        rtspUrl,
                        ip: dvrIP,
                        port: 554,
                        channel
                    })
                );
            }

            await Promise.all(promises);
            onComplete();
        } catch (err) {
            setError('Failed to add cameras. Please check credentials and try again.');
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content dvr-setup-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📹 Annke DVR Found!</h2>
                    <button className="close-btn" onClick={onCancel}>✕</button>
                </div>

                <div className="dvr-info">
                    <p>Found Annke DVR at <strong>{dvrIP}</strong></p>
                    <p className="info-text">Enter your DVR credentials to add cameras</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>DVR Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label>DVR Password *</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter DVR password"
                        />
                    </div>

                    <div className="form-group">
                        <label>Number of Channels</label>
                        <select
                            value={channelCount}
                            onChange={(e) => setChannelCount(parseInt(e.target.value))}
                        >
                            <option value={1}>1 Channel</option>
                            <option value={2}>2 Channels</option>
                            <option value={4}>4 Channels</option>
                            <option value={8}>8 Channels</option>
                            <option value={16}>16 Channels</option>
                            <option value={32}>32 Channels</option>
                        </select>
                        <small>Select how many camera channels your DVR has</small>
                    </div>

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="preview-info">
                        <strong>Will add {channelCount} cameras:</strong>
                        <ul>
                            {Array.from({ length: Math.min(channelCount, 3) }, (_, i) => (
                                <li key={i}>Annke Camera {i + 1} (Channel {(i + 1) * 100 + 1})</li>
                            ))}
                            {channelCount > 3 && <li>... and {channelCount - 3} more</li>}
                        </ul>
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? '⏳ Adding Cameras...' : `Add ${channelCount} Cameras`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
