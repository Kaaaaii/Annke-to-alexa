import { useState, useEffect } from 'react';
import axios from 'axios';
import './AlexaSetupModal.css';

interface AlexaSetupModalProps {
    onClose: () => void;
}

export default function AlexaSetupModal({ onClose }: AlexaSetupModalProps) {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/config')
            .then(res => setConfig(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const publicUrl = config?.cloudflareUrl || 'https://<your-tunnel-url>';

    return (
        <div className="modal-overlay">
            <div className="modal-content alexa-modal">
                <div className="modal-header">
                    <h2>🗣️ Alexa Integration Setup</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {loading ? <p>Loading config...</p> : (
                        <div className="setup-steps">
                            <p className="intro">To connect your cameras to Alexa, you need to create a Smart Home Skill in the Alexa Developer Console and point it to this bridge.</p>

                            <div className="step">
                                <h3>1. Prerequisites</h3>
                                <ul>
                                    <li>Amazon Developer Account</li>
                                    <li>Cloudflare Tunnel running (Public URL: <code>{publicUrl}</code>)</li>
                                </ul>
                            </div>

                            <div className="step">
                                <h3>2. Create Smart Home Skill</h3>
                                <ol>
                                    <li>Go to <a href="https://developer.amazon.com/alexa/console/ask" target="_blank" rel="noreferrer">Alexa Developer Console</a></li>
                                    <li>Create Skill &gt; Name "My Cameras" &gt; "Smart Home" &gt; "Provision your own"</li>
                                    <li>Choose "English (US)" (or your region)</li>
                                </ol>
                            </div>

                            <div className="step">
                                <h3>3. Configure Service Endpoint</h3>
                                <div className="info-box" style={{ background: '#f0f9ff', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '0.9em' }}>
                                    <strong>🌏 Region Selection:</strong><br />
                                    Create your Lambda function in the region closest to you that supports Alexa Smart Home:
                                    <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                        <li><strong>UK/Europe:</strong> Use <code>eu-west-1</code> (Dublin)</li>
                                        <li><strong>US West:</strong> Use <code>us-west-1</code> (N. California)</li>
                                        <li><strong>US East:</strong> Use <code>us-east-1</code> (N. Virginia)</li>
                                    </ul>
                                    <em>Note: Only use regions ending in <code>-1</code> as they support the required Lambda functions.</em>
                                </div>
                                <p>You need an <strong>AWS Lambda</strong> to proxy requests to your tunnel. Create a Python Lambda with this code:</p>
                                <pre className="code-block">
                                    {`import urllib3
import json
import os

http = urllib3.PoolManager()

def lambda_handler(event, context):
    url = "${publicUrl}/api/alexa"
    
    # Forward the directive to our bridge
    encoded_body = json.dumps(event).encode('utf-8')
    resp = http.request('POST', url,
                        body=encoded_body,
                        headers={'Content-Type': 'application/json'})
    
    return json.loads(resp.data.decode('utf-8'))`}
                                </pre>
                                <p><strong>Important:</strong> In the Lambda Designer:</p>
                                <ul>
                                    <li>Click <strong>+ Add trigger</strong></li>
                                    <li>Select <strong>Alexa Smart Home</strong></li>
                                    <li>Enter your Skill ID (from the Alexa Console)</li>
                                    <li>Click "Add"</li>
                                </ul>
                                <p>Then copy the Lambda ARN to the Alexa Skill "Smart Home" endpoint.</p>
                            </div>

                            <div className="step">
                                <h3>4. Setup Account Linking</h3>
                                <p>In the "Build" tab &gt; "Account Linking":</p>
                                <div className="kv-pairs">
                                    <div className="kv-pair">
                                        <label>Authorization URI</label>
                                        <input readOnly value={`${publicUrl}/api/auth`} />
                                    </div>
                                    <div className="kv-pair">
                                        <label>AccessToken URI</label>
                                        <input readOnly value={`${publicUrl}/api/auth/token`} />
                                    </div>
                                    <div className="kv-pair">
                                        <label>Client ID</label>
                                        <input readOnly value="alexa-client" />
                                    </div>
                                    <div className="kv-pair">
                                        <label>Client Secret</label>
                                        <input readOnly value="any-secret" />
                                    </div>
                                    <div className="kv-pair">
                                        <label>Scope</label>
                                        <input readOnly value="camera_access" />
                                    </div>
                                </div>
                            </div>

                            <div className="step">
                                <h3>5. Discovery</h3>
                                <p>Enable the skill in your Alexa App and discover devices!</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
