import { useState, useEffect } from 'react';
import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';
import { checkSetupStatus } from './api';
import './App.css';

function App() {
    const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSetupStatus()
            .then(completed => {
                setSetupCompleted(completed);
                setLoading(false);
            })
            .catch(() => {
                setSetupCompleted(false);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="app">
            {setupCompleted ? (
                <Dashboard />
            ) : (
                <SetupWizard onComplete={() => setSetupCompleted(true)} />
            )}
        </div>
    );
}

export default App;
