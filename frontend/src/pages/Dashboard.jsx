import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const [gardenStatus, setGardenStatus] = useState(null);

    useEffect(() => {
        if (user?.role === 'Citizen') {
            setLoading(true);
            Promise.all([
                api.get('/waste/history').catch(() => ({ data: [] })),
                api.get('/garden/status').catch(() => ({ data: { hasGarden: false } }))
            ])
                .then(([historyRes, gardenRes]) => {
                    setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
                    setGardenStatus(gardenRes.data ?? null);
                })
                .finally(() => setLoading(false));
        }
    }, [user]);

    const getRoleContent = () => {
        switch (user?.role) {
            case 'Admin':
                return (
                    <>
                        <h3>Admin Portal</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
                            Welcome to the administrative command center. Oversee the ecosystem, monitor cleanliness, and trace ZGX distributions.
                        </p>
                        <Link to="/admin">
                            <button className="btn" style={{ marginTop: '1rem' }}>Enter Analytics Dashboard</button>
                        </Link>
                    </>
                );
            case 'Worker':
                const milestoneProgress = (user?.successfulCollectionsCount || 0) % 10;
                const collectionsUntilBonus = 10 - milestoneProgress;

                return (
                    <>
                        <h3>Worker Hub</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '1rem', marginBottom: '1.5rem' }}>
                            View pending waste verifications and track your mileage towards the next ZGX operational bonus.
                        </p>

                        <div style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <strong style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Bonus Milestone Tracker</strong>
                                <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>150 ZGX Bonus</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                {collectionsUntilBonus === 10 && user?.successfulCollectionsCount > 0
                                    ? "Bonus just unlocked! Next milestone in 10 collections."
                                    : `${collectionsUntilBonus} collection${collectionsUntilBonus !== 1 ? 's' : ''} left until your next 150 ZGX bonus.`}
                            </div>

                            {/* Progress Bar Container */}
                            <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${(milestoneProgress / 10) * 100}%`,
                                    height: '100%',
                                    background: 'var(--primary-color)',
                                    transition: 'width 0.4s ease-out'
                                }} />
                            </div>
                            <div style={{ marginTop: '0.5rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Total Lifetime Collections: <strong>{user?.successfulCollectionsCount || 0}</strong>
                            </div>
                        </div>

                        <Link to="/pending-waste">
                            <button className="btn">View Pending Verifications</button>
                        </Link>
                    </>
                );
            case 'Citizen':
            default:
                const calculateDaysLeft = () => {
                    if (!gardenStatus?.nextEligibleDate) return 0;
                    const diff = new Date(gardenStatus.nextEligibleDate).getTime() - Date.now();
                    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
                };
                const daysLeft = calculateDaysLeft();

                return (
                    <>
                        <h3>Citizen Profile</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '1rem', marginBottom: '1.5rem' }}>
                            Submit waste material for AI validation and worker processing to earn direct ZGX allocations.
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                            <Link to="/submit-waste">
                                <button className="btn">Submit Waste for Reward</button>
                            </Link>

                            {/* Garden Action Button Logic */}
                            {gardenStatus?.hasGarden ? (
                                <Link to="/garden">
                                    <button className="btn" style={{ background: '#4CAF50' }}>Manage Terrace Garden</button>
                                </Link>
                            ) : (
                                <Link to="/garden">
                                    <button className="btn" style={{ background: 'transparent', border: '1px solid #4CAF50', color: '#4CAF50' }}>Start Terrace Garden</button>
                                </Link>
                            )}
                        </div>

                        {/* Withdrawal Section */}
                        <div style={{ padding: '1.5rem', background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '12px', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4 style={{ color: 'var(--primary-color)', margin: 0 }}>💰 ZGX Withdrawal (₹1:1)</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Min. 100 ZGX</span>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Convert ZGX into real-world currency vouchers.</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="number" placeholder="Amount" className="form-control" id="withdrawAmount" min="100" style={{ margin: 0, flex: 1 }} />
                                <button className="btn" style={{ margin: 0, background: 'var(--primary-color)', color: '#000' }} onClick={async () => {
                                    const amount = document.getElementById('withdrawAmount').value;
                                    if (!amount || amount < 100) return alert('Min 100 ZGX.');
                                    try {
                                        await api.post('/withdrawals/withdraw', { zgxAmount: amount });
                                        alert('Request submitted!');
                                        window.location.reload();
                                    } catch (err) { alert(err.response?.data?.message || 'Error'); }
                                }}>Withdraw</button>
                            </div>
                        </div>

                        {/* Garden Metrics Card */}
                        {gardenStatus?.hasGarden && (
                            <div style={{ padding: '1.5rem', background: 'rgba(76, 175, 80, 0.05)', border: '1px solid #4CAF50', borderRadius: '12px', marginBottom: '2rem' }}>
                                <h4 style={{ marginBottom: '1rem', color: '#4CAF50' }}>🌱 Terrace Garden Status</h4>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                    <span>Growth Progress:</span>
                                    <strong>{gardenStatus.garden.growthCount} / 3</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                    <span>Status:</span>
                                    <strong style={{ color: gardenStatus.garden.milestoneUnlocked ? 'var(--primary-color)' : 'var(--text-main)' }}>
                                        {gardenStatus.garden.milestoneUnlocked ? 'Completed' : 'Active'}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                    <span>Reward Potential:</span>
                                    <strong style={{ color: 'var(--primary-color)' }}>50 ZGX</strong>
                                </div>
                                {!gardenStatus.garden.milestoneUnlocked && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                        <span>Next Eligible Upload:</span>
                                        <strong style={{ color: daysLeft <= 0 ? 'var(--success)' : 'orange' }}>
                                            {daysLeft <= 0 ? 'Ready Now' : `In ${daysLeft} Days`}
                                        </strong>
                                    </div>
                                )}
                                {gardenStatus.garden.milestoneUnlocked && !gardenStatus.garden.rewardGiven && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <button className="btn" style={{ width: '100%', padding: '0.5rem', background: 'var(--primary-color)' }} onClick={async () => {
                                            try {
                                                await api.post('/garden/claim');
                                                window.location.reload();
                                            } catch (err) {
                                                alert(err.response?.data?.message || 'Error claiming');
                                            }
                                        }}>Claim 50 ZGX Reward</button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Your Submission History</h4>
                            {loading ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading submissions...</p>
                            ) : !Array.isArray(history) || history.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>You haven't submitted any waste yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {Array.isArray(history) && history.map(sub => (
                                        <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                                                    {sub.selectedCategory} {sub.predictedCategory && sub.predictedCategory !== sub.selectedCategory && `(AI: ${sub.predictedCategory})`}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {new Date(sub.submissionTimestamp).toLocaleString()}
                                                </div>
                                                {sub.collectionStatus === 'COLLECTED' && (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', marginTop: '0.3rem' }}>
                                                        {sub.weightKg} kg • +{Math.floor(sub.baseValue * 0.35)} ZGX
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <span style={{
                                                    padding: '0.3rem 0.6rem',
                                                    borderRadius: '99px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    background: sub.collectionStatus === 'COLLECTED' ? 'var(--success)' : 'orange',
                                                    color: '#fff'
                                                }}>
                                                    {sub.collectionStatus}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                );
        }
    };

    return (
        <div className="main-content" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="dashboard-header">
                <h1>Dashboard</h1>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="role-badge" style={{ textTransform: 'uppercase' }}>{user?.role}</div>
                    {user?.role !== 'Admin' && (
                        <div style={{ padding: '0.35rem 1rem', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', borderRadius: '99px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            Wallet: {user?.walletBalance || 0} ZGX
                        </div>
                    )}
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Welcome back, {user?.name}</p>
            </div>

            <div className="dashboard-card" style={{ width: '100%' }}>
                {getRoleContent()}
            </div>
        </div>
    );
};

export default Dashboard;
