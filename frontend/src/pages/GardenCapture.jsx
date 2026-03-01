import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
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

// Custom Map Event Component
const LocationMarker = ({ position, setPosition }) => {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
};

// Component to recenter map when position changes programmatically
const RecenterMap = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);
    return null;
};

const GardenCapture = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [position, setPosition] = useState(null);

    const [status, setStatus] = useState(null);
    const [loadingParams, setLoadingParams] = useState(true);

    const [loading, setLoading] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [locationError, setLocationError] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await api.get('/garden/status');
                setStatus(res.data);
            } catch (err) {
                console.error(err);
                setError('Failed to fetch garden status');
            } finally {
                setLoadingParams(false);

                // Auto-detect location
                if (navigator.geolocation) {
                    setIsLocating(true);
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                            setIsLocating(false);
                            setLocationError(null);
                        },
                        (err) => {
                            console.log('Location access denied.', err);
                            setIsLocating(false);
                            setLocationError('Location access denied. Please enable GPS.');
                        },
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                    );
                } else {
                    setLocationError('Geolocation not supported.');
                }
            }
        };
        fetchStatus();
    }, []);

    const handleFileSelect = (e) => {
        setError('');
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (selectedFile.size > 5 * 1024 * 1024) {
            setError('File size exceeds 5MB limit.');
            return;
        }

        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(selectedFile);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!file) {
            setError('Please capture or upload an image of your garden.');
            return;
        }

        // position is optional — submit works without GPS

        setLoading(true);

        const formData = new FormData();
        formData.append('image', file);
        // Only append coordinates if available
        if (position) {
            formData.append('latitude', position.lat);
            formData.append('longitude', position.lng);
        }

        try {
            const endpoint = status?.hasGarden ? '/garden/update' : '/garden/start';
            const res = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage(res.data.message);
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit garden data.');
        } finally {
            setLoading(false);
        }
    };

    if (loadingParams) return <div className="main-content">Loading...</div>;

    const isUpdate = status?.hasGarden;

    return (
        <div className="main-content" style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <div className="dashboard-header" style={{ width: '100%', maxWidth: '600px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <button className="btn" style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} onClick={() => navigate('/dashboard')}>
                        ← Back
                    </button>
                    <h1 style={{ margin: 0, color: '#4CAF50' }}>🌱 Terrace Garden</h1>
                </div>
                <p style={{ color: 'var(--text-muted)' }}>
                    {isUpdate ? 'Log your garden growth progress.' : 'Initialize your garden baseline.'}
                </p>
            </div>

            <div className="dashboard-card" style={{ width: '100%', maxWidth: '600px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {error && <div className="error-message">{error}</div>}
                    {message && <div style={{ padding: '1rem', background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', borderRadius: '8px' }}>{message}</div>}

                    {/* Camera Capture Section */}
                    <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>1. Capture Live Image</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                className="btn"
                                onClick={() => fileInputRef.current?.click()}
                                style={{ flex: 1, border: '1px solid var(--primary-color)', background: 'transparent', color: 'var(--primary-color)' }}
                            >
                                📷 Open Camera / Upload
                            </button>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                        </div>
                    </div>

                    {preview && (
                        <div style={{ width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img src={preview} alt="Garden Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    )}

                    {/* Location Section */}
                    <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                            2. Confirm Location
                            {position && <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#4CAF50', fontWeight: 'normal' }}>✓ Location Set</span>}
                            {isLocating && <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 'normal' }}>⌛ Locating...</span>}
                        </label>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            Allow location access or tap the map to place your pin exactly over your garden.
                        </div>

                        {locationError && (
                            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                ⚠️ {locationError}
                            </div>
                        )}

                        <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            {position && isFinite(position.lat) && isFinite(position.lng) ? (
                                <MapContainer
                                    center={[position.lat, position.lng]}
                                    zoom={16}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <LocationMarker position={position} setPosition={setPosition} />
                                    <RecenterMap position={position} />
                                </MapContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                    {isLocating ? 'Acquiring GPS Signal...' : 'Waiting for location signal...'}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn"
                        style={{
                            background: '#4CAF50',
                            opacity: loading ? 0.6 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : (isUpdate ? 'Log Growth Progress' : 'Start Garden')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default GardenCapture;
