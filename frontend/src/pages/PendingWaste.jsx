import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

const PendingWaste = () => {
    const { user, fetchMe } = useContext(AuthContext); // Extract user and fetchMe to refresh wallet globally
    const [submissions, setSubmissions] = useState([]);
    const [weights, setWeights] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [rewardMsg, setRewardMsg] = useState(null);

    // Worker Location State
    const [workerPosition, setWorkerPosition] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState(null);

    const fetchPending = async () => {
        try {
            const res = await api.get('/waste/pending');
            setSubmissions(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            setError('Failed to load pending submissions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();

        // Fetch worker location for distance checking
        if (navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setWorkerPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setIsLocating(false);
                    setLocationError(null);
                },
                (err) => {
                    console.log('Worker location access denied/unavailable.');
                    setIsLocating(false);
                    setLocationError('Location access denied. Please enable GPS to verify collections.');
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        } else {
            setLocationError('Geolocation is not supported by your browser.');
        }
    }, []);

    const handleWeightChange = (id, value) => {
        setWeights(prev => ({ ...prev, [id]: value }));
    };

    const handleVerify = async (id) => {
        setRewardMsg(null);
        setError('');

        const weightKg = parseFloat(weights[id]);
        if (!weightKg || weightKg <= 0 || weightKg > 50) {
            setError('Please input a valid weight between 0.1 and 50 kg.');
            return;
        }

        try {
            const res = await api.post(`/waste/verify/${id}`, {
                weightKg,
                workerLatitude: workerPosition?.lat,
                workerLongitude: workerPosition?.lng
            });
            const { citizenReward, workerReward } = res.data.rewardSummary;
            const finalizedWeight = res.data.weightKg;

            setRewardMsg(
                <div>
                    <div><strong>Collection Verified</strong></div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        Weight: {finalizedWeight} kg<br />
                        Citizen Earned: {citizenReward} ZGX
                        {workerReward > 0 && <div><br />Worker Milestone Reward: {workerReward} ZGX</div>}
                    </div>
                </div>
            );

            // Cleanup local state
            setWeights(prev => {
                const newObj = { ...prev };
                delete newObj[id];
                return newObj;
            });
            fetchPending(); // Refresh list
            fetchMe(); // Refresh global wallet balance on Nav
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed');
        }
    };

    if (loading) return <div className="main-content">Loading queue...</div>;

    const getImageUrl = (path) => {
        if (!path) return null;
        const baseUrl = `${window.location.protocol}//${window.location.hostname}:5005`;
        return `${baseUrl}${path}`;
    };

    return (
        <div className="main-content" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="dashboard-header" style={{ width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Pending Scans</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Verify citizen bags to process rewards</p>
                </div>
                {user && user.role === 'Worker' && (
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Milestone Progress</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                            Collections: {(user.successfulCollectionsCount || 0) % 10} / 10
                        </div>
                    </div>
                )}
            </div>

            {rewardMsg && (
                <div style={{ padding: '1rem', background: 'rgba(0, 230, 118, 0.1)', color: 'var(--success)', borderRadius: '8px', marginBottom: '1.5rem', width: '100%', maxWidth: '600px' }}>
                    {rewardMsg}
                </div>
            )}

            {error && <div className="error-message" style={{ width: '100%', textAlign: 'left' }}>{error}</div>}

            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {!Array.isArray(submissions) || submissions.length === 0 ? (
                    <div className="dashboard-card"><p>No pending waste to collect right now.</p></div>
                ) : (
                    Array.isArray(submissions) && submissions.map((sub) => {
                        let distanceWarning = false;
                        if (workerPosition && sub.latitude && sub.longitude) {
                            const dist = getDistanceInMeters(workerPosition.lat, workerPosition.lng, sub.latitude, sub.longitude);
                            if (dist > 500) distanceWarning = true;
                        }

                        return (
                            <div key={sub.id} className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                {/* Top Info Row */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: '1 1 50%' }}>
                                        <h4 style={{ color: 'var(--primary-color)', marginBottom: '0.25rem' }}>Sub #{sub.id}</h4>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                            User declared: <strong>{sub.selectedCategory}</strong><br />
                                            AI prediction: <span style={{ color: 'var(--text-muted)' }}>{sub.predictedCategory} ({sub.confidenceScore}%)</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                            📅 {new Date(sub.submissionTimestamp || sub.createdAt).toLocaleString()}
                                        </div>

                                        {sub.imagePath && (
                                            <img
                                                src={getImageUrl(sub.imagePath)}
                                                alt="Waste Bag"
                                                style={{ marginTop: '0.5rem', width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                                            />
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 auto', minWidth: '150px' }}>
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Weight (kg)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0.1"
                                            max="50"
                                            className="form-control"
                                            placeholder="Enter weight..."
                                            value={weights[sub.id] || ''}
                                            onChange={(e) => handleWeightChange(sub.id, e.target.value)}
                                            style={{ margin: 0 }}
                                        />
                                        <button
                                            className="btn"
                                            style={{
                                                margin: 0,
                                                padding: '0.5rem 1rem',
                                                opacity: (isLocating || locationError) ? 0.5 : 1,
                                                cursor: (isLocating || locationError) ? 'not-allowed' : 'pointer'
                                            }}
                                            onClick={() => handleVerify(sub.id)}
                                            disabled={isLocating || locationError}
                                        >
                                            {isLocating ? 'Locating...' : 'Verify'}
                                        </button>
                                        {locationError && (
                                            <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                                {locationError}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Map & Geo Row */}
                                {sub.latitude && sub.longitude && isFinite(sub.latitude) && isFinite(sub.longitude) && (
                                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                📍 {sub.latitude.toFixed(6)}, {sub.longitude.toFixed(6)}
                                            </div>
                                            <a
                                                href={`https://www.google.com/maps?q=${sub.latitude},${sub.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '0.85rem', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}
                                            >
                                                Open in Google Maps ↗
                                            </a>
                                        </div>

                                        <div style={{ height: '150px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                            <MapContainer
                                                center={[sub.latitude, sub.longitude]}
                                                zoom={16}
                                                style={{ height: '100%', width: '100%' }}
                                                dragging={false}
                                                scrollWheelZoom={false}
                                                zoomControl={false}
                                            >
                                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                <Marker position={[sub.latitude, sub.longitude]} />
                                            </MapContainer>
                                        </div>

                                        {distanceWarning && (
                                            <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(255, 165, 0, 0.1)', color: 'orange', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid rgba(255, 165, 0, 0.3)' }}>
                                                ⚠️ <strong>Warning:</strong> You appear to be far from the collection point. Hard enforcement: Verification will fail if &gt; 500m.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default PendingWaste;
