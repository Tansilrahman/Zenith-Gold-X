import React, { useState, useEffect } from 'react';
import api from '../services/api';

const WithdrawalList = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWithdrawals = async () => {
        try {
            const res = await api.get('/withdrawals/history');
            const data = Array.isArray(res.data) ? res.data : [];
            setWithdrawals(data.filter(w => w.status === 'pending'));
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    useEffect(() => { fetchWithdrawals(); }, []);

    const handleAction = async (id, status) => {
        try {
            await api.post('/withdrawals/process', { withdrawalId: id, status });
            fetchWithdrawals();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    if (loading) return <p>Loading...</p>;
    if (withdrawals.length === 0) return <p style={{ color: 'var(--text-muted)' }}>No pending requests.</p>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.isArray(withdrawals) && withdrawals.map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.9rem' }}>
                        <strong>{w.userName}</strong>: {w.zgxAmount} ZGX → ₹{w.rupeeValue}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn" style={{ padding: '0.2rem 0.5rem', background: 'var(--success)', fontSize: '0.8rem' }} onClick={() => handleAction(w.id, 'approved')}>Approve</button>
                        <button className="btn" style={{ padding: '0.2rem 0.5rem', background: 'var(--danger)', fontSize: '0.8rem' }} onClick={() => handleAction(w.id, 'rejected')}>Reject</button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const AdminDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await api.get('/admin');
                setMetrics(res.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load analytics.');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="main-content">Loading Admin Analytics...</div>;
    if (error) return <div className="main-content"><div className="error-message">{error}</div></div>;

    return (
        <div className="main-content" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <div className="dashboard-header" style={{ width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>
                <h1>Admin Command Center</h1>
                <p style={{ color: 'var(--text-muted)' }}>Global overview of the Zenith Gold X ecosystem</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>

                {/* Core User Metrics */}
                <div className="dashboard-card glow-card" style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Citizens</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{metrics.totalUsers || 0}</div>
                </div>

                <div className="dashboard-card glow-card" style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Workers</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{metrics.totalWorkers || 0}</div>
                </div>

                {/* Waste Metrics */}
                <div className="dashboard-card glow-card" style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Submissions</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{metrics.totalSubmissions || 0}</div>
                </div>

                <div className="dashboard-card glow-card" style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Collected</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{metrics.totalCollected || 0}</div>
                </div>

                <div className="dashboard-card glow-card" style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Weight</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{metrics.totalWeightCollected || 0} kg</div>
                </div>

                {/* Economy Matrix */}
                <div className="dashboard-card glow-card" style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>ZGX Distributed</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{metrics.totalZGXDistributed || 0}</div>
                </div>

                {/* Fraud Metrics */}
                <div className="dashboard-card glow-card" style={{ textAlign: 'center', border: '1px solid var(--danger)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Duplicate Attempts</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{metrics.duplicateAttempts || 0}</div>
                </div>

                {/* Time Metrics */}
                <div className="dashboard-card glow-card" style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Submissions (Last 24h)</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{metrics.submissionsLast24Hours || 0}</div>
                </div>
            </div>

            {/* Cleanliness Projection Card */}
            <div className="dashboard-card glow-card" style={{ border: '1px solid var(--primary-color)', width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Cleanliness Projection</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Projected environmental impact based on current collection velocity:
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Weekly Output Estimate:</span>
                    <strong>~{Math.floor((metrics.totalWeightCollected || 5) * 7).toLocaleString()} kg</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Expected Worker Bonuses:</span>
                    <strong style={{ color: 'var(--primary-color)' }}>~{Math.floor((metrics.totalCollected || 0) / 10) * 150} ZGX</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ecosystem Health:</span>
                    <strong style={{ color: 'var(--success)' }}>
                        {(metrics.totalCollected / (metrics.totalSubmissions || 1)) >= 0.5 ? 'Stable' : 'Critical'}
                    </strong>
                </div>
            </div>

            {/* Admin Economic Summary Card */}
            <div className="dashboard-card glow-card" style={{ border: '1px solid var(--border-color)', width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Economic Integrity Summary</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Base Value Generated:</span>
                    <strong>{metrics.totalBaseValue || 0} ZGX</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Citizen Rewards Minted:</span>
                    <strong style={{ color: 'var(--primary-color)' }}>{metrics.totalCitizenRewards || 0} ZGX</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Worker Rewards Minted:</span>
                    <strong style={{ color: 'var(--primary-color)' }}>{metrics.totalWorkerRewards || 0} ZGX</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sustainability Reserve:</span>
                    <strong style={{ color: (metrics.sustainabilityReserve || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {metrics.sustainabilityReserve || 0} ZGX
                    </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Reserve Ratio:</span>
                    <strong>{metrics.reserveRatio || '0.000'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Reserve Health Status:</span>
                    <strong style={{
                        color: metrics.reserveHealth === 'Healthy' ? 'var(--success)' :
                            metrics.reserveHealth === 'Monitor' ? '#FFD700' :
                                metrics.reserveHealth === 'Risk' ? '#FFA500' : 'var(--danger)'
                    }}>
                        {metrics.reserveHealth || 'Unknown'}
                    </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Landfill Diversion Estimate:</span>
                    <strong style={{ color: 'var(--primary-color)' }}>{metrics.landfillDiversionEstimate?.toFixed(1) || 0} kg</strong>
                </div>
            </div>

            {/* AI Performance Card */}
            <div className="dashboard-card glow-card" style={{ border: '1px solid var(--primary-color)', width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>🤖 AI Verification Insights</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total AI Rejections:</span>
                    <strong style={{ color: 'var(--danger)' }}>{metrics.aiMetrics?.totalRejections || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Avg AI Confidence Score:</span>
                    <strong>{metrics.aiMetrics?.avgConfidence?.toFixed(1) || 0}%</strong>
                </div>
            </div>

            {/* Withdrawal Management Section */}
            <div className="dashboard-card glow-card" style={{ border: '1px solid var(--primary-color)', width: '100%', maxWidth: '800px', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>💰 Pending Withdrawals</h3>
                <WithdrawalList />
            </div>

            {/* Terrace Garden Metrics Card */}
            <div className="dashboard-card glow-card" style={{ border: '1px solid #4CAF50', width: '100%', maxWidth: '800px' }}>
                <h3 style={{ marginBottom: '1rem', color: '#4CAF50' }}>🌱 Terrace Garden Analytics</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Active Gardens:</span>
                    <strong>{metrics.totalActiveGardens || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Completed Gardens:</span>
                    <strong style={{ color: '#4CAF50' }}>{metrics.totalCompletedGardens || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Garden Rewards Distributed:</span>
                    <strong style={{ color: 'var(--primary-color)' }}>{metrics.totalGardenRewards || 0} ZGX</strong>
                </div>
            </div>

        </div>
    );
};

export default AdminDashboard;
