import { useState } from 'react';
import { saveConfig, type Config } from '../api';
import './SetupWizard.css';

interface SetupWizardProps {
    onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [config, setConfig] = useState<Config>({
        dvr: {
            username: 'admin',
            password: '',
            ip: '',
            port: 554
        },
        webrtc: {
            stunServer: 'stun:stun.l.google.com:19302',
            turnServer: '',
            turnUsername: '',
            turnPassword: ''
        },
        discovery: {
            autoDiscover: true,
            interval: 300000,
            maxCameras: 16
        },
        alexa: {
            clientId: '',
            clientSecret: '',
            redirectUri: ''
        }
    });

    const handleSubmit = async () => {
        setLoading(true);
        setError('');

        try {
            await saveConfig(config);
            onComplete();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save configuration');
        } finally {
            setLoading(false);
        }
    };

    const updateDVR = (field: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            dvr: { ...prev.dvr!, [field]: value }
        }));
    };

    const updateWebRTC = (field: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            webrtc: { ...prev.webrtc!, [field]: value }
        }));
    };

    const updateDiscovery = (field: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            discovery: { ...prev.discovery!, [field]: value }
        }));
    };

    const updateAlexa = (field: string, value: any) => {
        setConfig(prev => ({
            ...prev,
            alexa: { ...prev.alexa!, [field]: value }
        }));
    };

    return (
        <div className="setup-wizard">
            <div className="setup-container">
                <div className="setup-header">
                    <h1>🎥 Annke to Alexa Setup</h1>
                    <p>Let's configure your DVR camera system</p>
                </div>

                <div className="setup-progress">
                    <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1. DVR</div>
                    <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2. WebRTC</div>
                    <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3. Discovery</div>
                    <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>4. Alexa</div>
                </div>

                <div className="setup-content">
                    {step === 1 && (
                        <div className="setup-step">
                            <h2>DVR Configuration</h2>
                            <p className="step-description">
                                Enter your Annke DVR/NVR credentials and network information
                            </p>

                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    value={config.dvr?.username}
                                    onChange={e => updateDVR('username', e.target.value)}
                                    placeholder="admin"
                                />
                            </div>

                            <div className="form-group">
                                <label>Password *</label>
                                <input
                                    type="password"
                                    value={config.dvr?.password}
                                    onChange={e => updateDVR('password', e.target.value)}
                                    placeholder="Enter DVR password"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>DVR IP Address (optional)</label>
                                <input
                                    type="text"
                                    value={config.dvr?.ip}
                                    onChange={e => updateDVR('ip', e.target.value)}
                                    placeholder="192.168.1.100"
                                />
                                <small>Leave empty for auto-discovery</small>
                            </div>

                            <div className="form-group">
                                <label>RTSP Port</label>
                                <input
                                    type="number"
                                    value={config.dvr?.port}
                                    onChange={e => updateDVR('port', parseInt(e.target.value))}
                                    placeholder="554"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="setup-step">
                            <h2>WebRTC Configuration</h2>
                            <p className="step-description">
                                Configure STUN/TURN servers for WebRTC streaming
                            </p>

                            <div className="form-group">
                                <label>STUN Server</label>
                                <input
                                    type="text"
                                    value={config.webrtc?.stunServer}
                                    onChange={e => updateWebRTC('stunServer', e.target.value)}
                                    placeholder="stun:stun.l.google.com:19302"
                                />
                                <small>Default Google STUN server works for most cases</small>
                            </div>

                            <div className="form-group">
                                <label>TURN Server (optional)</label>
                                <input
                                    type="text"
                                    value={config.webrtc?.turnServer}
                                    onChange={e => updateWebRTC('turnServer', e.target.value)}
                                    placeholder="turn:your-turn-server.com:3478"
                                />
                                <small>Required for NAT traversal in some networks</small>
                            </div>

                            {config.webrtc?.turnServer && (
                                <>
                                    <div className="form-group">
                                        <label>TURN Username</label>
                                        <input
                                            type="text"
                                            value={config.webrtc?.turnUsername}
                                            onChange={e => updateWebRTC('turnUsername', e.target.value)}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>TURN Password</label>
                                        <input
                                            type="password"
                                            value={config.webrtc?.turnPassword}
                                            onChange={e => updateWebRTC('turnPassword', e.target.value)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="setup-step">
                            <h2>Camera Discovery</h2>
                            <p className="step-description">
                                Configure automatic camera discovery settings
                            </p>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={config.discovery?.autoDiscover}
                                        onChange={e => updateDiscovery('autoDiscover', e.target.checked)}
                                    />
                                    Enable automatic discovery
                                </label>
                                <small>Automatically find cameras on your network using ONVIF</small>
                            </div>

                            <div className="form-group">
                                <label>Discovery Interval (minutes)</label>
                                <input
                                    type="number"
                                    value={(config.discovery?.interval || 300000) / 60000}
                                    onChange={e => updateDiscovery('interval', parseInt(e.target.value) * 60000)}
                                    min="1"
                                    max="60"
                                />
                                <small>How often to scan for new cameras</small>
                            </div>

                            <div className="form-group">
                                <label>Maximum Cameras</label>
                                <input
                                    type="number"
                                    value={config.discovery?.maxCameras}
                                    onChange={e => updateDiscovery('maxCameras', parseInt(e.target.value))}
                                    min="1"
                                    max="32"
                                />
                                <small>Maximum number of camera channels to probe</small>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="setup-step">
                            <h2>Alexa Integration (Optional)</h2>
                            <p className="step-description">
                                Configure Alexa Smart Home integration for Echo Show
                            </p>

                            <div className="info-box">
                                <p>
                                    <strong>Note:</strong> Alexa integration requires a Cloudflare Tunnel
                                    and an Alexa Smart Home skill. You can skip this step and configure
                                    it later.
                                </p>
                            </div>

                            <div className="form-group">
                                <label>Alexa Client ID</label>
                                <input
                                    type="text"
                                    value={config.alexa?.clientId}
                                    onChange={e => updateAlexa('clientId', e.target.value)}
                                    placeholder="amzn1.application-oa2-client..."
                                />
                            </div>

                            <div className="form-group">
                                <label>Alexa Client Secret</label>
                                <input
                                    type="password"
                                    value={config.alexa?.clientSecret}
                                    onChange={e => updateAlexa('clientSecret', e.target.value)}
                                    placeholder="Enter client secret"
                                />
                            </div>

                            <div className="form-group">
                                <label>Redirect URI</label>
                                <input
                                    type="text"
                                    value={config.alexa?.redirectUri}
                                    onChange={e => updateAlexa('redirectUri', e.target.value)}
                                    placeholder="https://your-domain.com/auth/alexa/callback"
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}
                </div>

                <div className="setup-actions">
                    {step > 1 && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => setStep(step - 1)}
                            disabled={loading}
                        >
                            ← Back
                        </button>
                    )}

                    {step < 4 ? (
                        <button
                            className="btn btn-primary"
                            onClick={() => setStep(step + 1)}
                            disabled={step === 1 && !config.dvr?.password}
                        >
                            Next →
                        </button>
                    ) : (
                        <>
                            <button
                                className="btn btn-secondary"
                                onClick={handleSubmit}
                                disabled={loading || !config.dvr?.password}
                            >
                                {loading ? 'Saving...' : 'Skip Alexa & Complete'}
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={loading || !config.dvr?.password || !config.alexa?.clientId}
                            >
                                {loading ? 'Saving...' : 'Complete with Alexa'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
