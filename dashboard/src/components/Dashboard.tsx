import { useState, useEffect } from 'react';
import { getCameras, triggerDiscovery, getStatus, type Camera } from '../api';
import axios from 'axios';
import CameraCard from './CameraCard';
import AddCameraModal from './AddCameraModal';
import DVRSetupModal from './DVRSetupModal';
import GridViewModal from './GridViewModal';
import AlexaSetupModal from './AlexaSetupModal';
import './Dashboard.css';

export default function Dashboard() {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [discovering, setDiscovering] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAlexaModal, setShowAlexaModal] = useState(false);
    const [showGridView, setShowGridView] = useState(false);
    const [dvrSetupIP, setDvrSetupIP] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [camerasData, statusData] = await Promise.all([
                getCameras(),
                getStatus()
            ]);

            // Check if any camera needs DVR setup (channel = 0)
            const dvrNeedsSetup = camerasData.find(c => c.channel === 0);
            if (dvrNeedsSetup && !dvrSetupIP) {
                setDvrSetupIP(dvrNeedsSetup.ip);
                // Remove the placeholder DVR entry
                await axios.delete(`/api/cameras/${dvrNeedsSetup.id}`);
            }

            setCameras(camerasData.filter(c => c.channel !== 0));
            setStatus(statusData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDiscover = async () => {
        setDiscovering(true);
        try {
            await triggerDiscovery();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
            await loadData();
        } catch (error) {
            console.error('Discovery failed:', error);
        } finally {
            setDiscovering(false);
        }
    };

    const handleAddCamera = async (cameraData: {
        name: string;
        rtspUrl: string;
        ip: string;
        port: number;
        channel: number;
    }) => {
        try {
            await axios.post('/api/cameras', cameraData);
            await loadData(); // Reload cameras
        } catch (error) {
            console.error('Failed to add camera:', error);
            alert('Failed to add camera. Please check the details and try again.');
        }
    };


    const handleDeleteCamera = async (cameraId: string) => {
        try {
            await axios.delete(`/api/cameras/${cameraId}`);
            await loadData(); // Reload cameras
        } catch (error) {
            console.error('Failed to delete camera:', error);
            alert('Failed to delete camera. Please try again.');
        }
    };

    const handleUpdateCamera = async (cameraId: string, updates: Partial<Camera>) => {
        try {
            await axios.patch(`/api/cameras/${cameraId}`, updates);
            await loadData(); // Reload cameras
        } catch (error) {
            console.error('Failed to update camera:', error);
            throw error; // Re-throw to let the modal handle the error
        }
    };

    const handleDVRSetupComplete = () => {
        setDvrSetupIP(null);
        loadData();
    };


    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>🎥 Annke to Alexa</h1>
                    <div className="header-status">
                        <div className={`status-badge ${status?.webrtc === 'ready' ? 'online' : 'offline'}`}>
                            WebRTC: {status?.webrtc || 'unknown'}
                        </div>
                        <div className="status-badge online">
                            Cameras: {status?.cameras?.online || 0}/{status?.cameras?.total || 0}
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowGridView(true)}
                        disabled={cameras.length === 0}
                        title="4x4 Grid View"
                    >
                        🔲 Grid View
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowAlexaModal(true)}
                    >
                        🗣️ Alexa Setup
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowAddModal(true)}
                    >
                        ➕ Add Camera
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleDiscover}
                        disabled={discovering}
                    >
                        {discovering ? '🔄 Discovering...' : '🔍 Discover Cameras'}
                    </button>
                </div>
            </header>

            <main className="dashboard-content">
                {cameras.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📹</div>
                        <h2>No Cameras Found</h2>
                        <p>Click "Discover Cameras" to scan your network or "Add Camera" to add one manually</p>
                        <div className="empty-actions">
                            <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
                                ➕ Add Manually
                            </button>
                            <button className="btn btn-primary" onClick={handleDiscover}>
                                🔍 Start Discovery
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="camera-grid">
                        {cameras.map(camera => (
                            <CameraCard
                                key={camera.id}
                                camera={camera}
                                onDelete={handleDeleteCamera}
                                onUpdate={handleUpdateCamera}
                            />
                        ))}
                    </div>
                )}
            </main>

            <footer className="dashboard-footer">
                <p>Annke to Alexa • WebRTC Camera Streaming</p>
                <p className="footer-links">
                    <a href="/api/status" target="_blank">API Status</a>
                    <span>•</span>
                    <a href="https://github.com" target="_blank">GitHub</a>
                </p>
            </footer>

            {showAddModal && (
                <AddCameraModal
                    onClose={() => setShowAddModal(false)}
                    onAdd={handleAddCamera}
                />
            )}

            {dvrSetupIP && (
                <DVRSetupModal
                    dvrIP={dvrSetupIP}
                    onComplete={handleDVRSetupComplete}
                    onCancel={() => setDvrSetupIP(null)}
                />
            )}

            {showGridView && (
                <GridViewModal
                    cameras={cameras}
                    onClose={() => setShowGridView(false)}
                />
            )}

            {showAlexaModal && (
                <AlexaSetupModal onClose={() => setShowAlexaModal(false)} />
            )}
        </div>
    );
}
