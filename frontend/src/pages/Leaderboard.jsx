import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState({ topCitizens: [], topWorkers: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await api.get('/leaderboard');
                setLeaderboard({
                    topCitizens: Array.isArray(res.data?.topCitizens) ? res.data.topCitizens : [],
                    topWorkers: Array.isArray(res.data?.topWorkers) ? res.data.topWorkers : []
                });
            } catch (err) {
                setError('Failed to load leaderboard data.');
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getMedal = (index) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return <span style={{ opacity: 0.5 }}>#{index + 1}</span>;
    };

    if (loading) return <div className="main-content">Loading Leaderboards...</div>;

    return (
        <div className="main-content" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div className="dashboard-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1>Ecosystem Leaderboard</h1>
                <p style={{ color: 'var(--text-muted)' }}>Top contributors in the Zenith Gold X network</p>
                {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', maxWidth: '800px' }}>

                {/* Citizens Section */}
                <div className="dashboard-card glow-card">
                    <h2 style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏆 Top Citizens
                    </h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '0.75rem 0' }}>Rank</th>
                                <th>Name / Email</th>
                                <th style={{ textAlign: 'right' }}>ZGX Earned</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!Array.isArray(leaderboard.topCitizens) || leaderboard.topCitizens.length === 0 ? (
                                <tr>
                                    <td colSpan="3" style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No data available yet</td>
                                </tr>
                            ) : (
                                Array.isArray(leaderboard.topCitizens) && leaderboard.topCitizens.map((citizen, idx) => (
                                    <tr key={citizen.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.75rem 0', fontSize: '1.2rem' }}>{getMedal(idx)}</td>
                                        <td>
                                            <strong>{citizen.name}</strong><br />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{citizen.email}</span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-color)' }}>{citizen.walletBalance} ZGX</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Workers Section */}
                <div className="dashboard-card glow-card">
                    <h2 style={{ color: 'var(--primary-color)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        🏆 Top Workers
                    </h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '0.75rem 0' }}>Rank</th>
                                <th>Name / Email</th>
                                <th style={{ textAlign: 'right' }}>Collections</th>
                                <th style={{ textAlign: 'right' }}>ZGX Earned</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!Array.isArray(leaderboard.topWorkers) || leaderboard.topWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '1rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No data available yet</td>
                                </tr>
                            ) : (
                                Array.isArray(leaderboard.topWorkers) && leaderboard.topWorkers.map((worker, idx) => (
                                    <tr key={worker.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '0.75rem 0', fontSize: '1.2rem' }}>{getMedal(idx)}</td>
                                        <td>
                                            <strong>{worker.name}</strong><br />
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{worker.email}</span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>{worker.successfulCollectionsCount}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-color)' }}>{worker.walletBalance} ZGX</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default Leaderboard;
