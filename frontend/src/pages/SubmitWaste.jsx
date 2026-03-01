import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issues with React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Subcomponent to handle map clicks for draggable marker
const LocationMarker = ({ position, setPosition }) => {
    const map = useMap();

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    return position === null ? null : (
        <Marker
            position={position}
            draggable={true}
            eventHandlers={{
                dragend: (e) => {
                    setPosition(e.target.getLatLng());
                },
            }}
        />
    );
};

const SubmitWaste = () => {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [imageBlob, setImageBlob] = useState(null);
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // Map Location State
    const [position, setPosition] = useState(null);
    const [locationFetched, setLocationFetched] = useState(false);

    // UI State
    const [inputMode, setInputMode] = useState('camera'); // 'camera' or 'upload'

    // Live Camera References
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);

    // Initialize Camera and Geolocation on Mount
    useEffect(() => {
        if (inputMode === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }

        if (!locationFetched) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        setLocationFetched(true);
                    },
                    (err) => {
                        console.error("Location error:", err);
                        setStatus('error');
                        setResult('Unable to auto-detect location. Please ensure location services are enabled or click on the map to manually drop a pin.');
                        setLocationFetched(true); // Stop retrying constantly
                        // Setup fallback center point (e.g. general city location)
                        setPosition({ lat: 40.7128, lng: -74.0060 }); // default to NY for fallback view
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 0,
                    }
                );
            } else {
                setLocationFetched(true);
                setPosition({ lat: 40.7128, lng: -74.0060 });
            }
        }

        return () => stopCamera();
    }, [inputMode]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setInputMode('upload'); // Fallback to upload
            setStatus('error');
            setResult('Unable to access camera. Falling back to manual upload.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const captureFrame = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                setImageBlob(blob);
                setPreview(URL.createObjectURL(blob));
            }
        }, 'image/jpeg', 0.85);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageBlob(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const resetImage = () => {
        setImageBlob(null);
        setPreview(null);
        setStatus('');
        setResult(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus('');
        setResult(null);

        if (!position || !position.lat || !position.lng) {
            setStatus('error');
            setResult('Valid map location is required before submitting.');
            setLoading(false);
            return;
        }

        if (!imageBlob) {
            setStatus('error');
            setResult('Please provide an image.');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('selectedCategory', selectedCategory);
        formData.append('latitude', position.lat);
        formData.append('longitude', position.lng);
        formData.append('image', imageBlob, imageBlob.name || `snapshot-${Date.now()}.jpg`);

        try {
            const res = await api.post('/waste/submit', formData);
            setStatus('success');
            setResult(res.data);
            setSelectedCategory('');
            setImageBlob(null);
            setPreview(null);
        } catch (err) {
            setStatus('error');
            setResult(err.response?.data?.message || 'Error submitting waste');
        } finally {
            // Restore geo-location for next submission naturally
            setLoading(false);
        }
    };

    return (
        <div className="main-content">
            <div className="dashboard-card" style={{ maxWidth: '600px', width: '100%' }}>
                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Live AI Waste Capture</h2>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button
                        className="btn"
                        style={{ flex: 1, background: inputMode === 'camera' ? 'var(--primary-color)' : 'var(--bg-secondary)', border: inputMode === 'camera' ? 'none' : '1px solid var(--border-color)', color: inputMode === 'camera' ? '#000' : 'var(--text-main)' }}
                        onClick={() => { setInputMode('camera'); resetImage(); }}
                    >
                        Use Camera 📸
                    </button>
                    <button
                        className="btn"
                        style={{ flex: 1, background: inputMode === 'upload' ? 'var(--primary-color)' : 'var(--bg-secondary)', border: inputMode === 'upload' ? 'none' : '1px solid var(--border-color)', color: inputMode === 'upload' ? '#000' : 'var(--text-main)' }}
                        onClick={() => { setInputMode('upload'); resetImage(); }}
                    >
                        Upload Photo 📁
                    </button>
                </div>

                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    {inputMode === 'camera'
                        ? 'Aim your camera at the object and capture a clear view before selecting the appropriate category.'
                        : 'Upload a clear picture of the waste before selecting the appropriate category.'}
                </p>

                {status === 'success' && result && (
                    <div style={{ padding: '1rem', background: 'rgba(0, 230, 118, 0.1)', color: 'var(--success)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                        <strong>{result.message}</strong>
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            AI Accepted Category: <span style={{ color: 'var(--primary-color)' }}>{result.predictedCategory}</span>
                            ({result.confidenceScore}% confidence)
                        </div>
                    </div>
                )}

                {status === 'error' && result && (
                    <div style={{ padding: '1rem', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--error)', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                        {result}
                    </div>
                )}

                {inputMode === 'camera' ? (
                    <div style={{ marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {!preview ? (
                            <>
                                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
                                <button type="button" className="btn" style={{ margin: '1rem', width: 'calc(100% - 2rem)' }} onClick={captureFrame}>
                                    Capture 📸
                                </button>
                            </>
                        ) : (
                            <>
                                <img src={preview} alt="Captured Preview" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
                                <button type="button" className="btn" style={{ margin: '1rem', width: 'calc(100% - 2rem)', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }} onClick={resetImage}>
                                    Retake Photo ↺
                                </button>
                            </>
                        )}
                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                    </div>
                ) : (
                    <div style={{ marginBottom: '1.5rem' }}>
                        {!preview ? (
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Select Image File (<span style={{ color: 'var(--primary-color)' }}>Max 5MB, JPEG/PNG</span>)</label>
                                <input
                                    type="file"
                                    accept="image/jpeg, image/png"
                                    onChange={handleFileUpload}
                                    style={{ color: 'var(--text-muted)' }}
                                />
                            </div>
                        ) : (
                            <div style={{ borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src={preview} alt="Upload Preview" style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                <button type="button" className="btn" style={{ marginTop: '1rem', width: '100%', background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }} onClick={resetImage}>
                                    Choose Different File ↺
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Map Location Selector */}
                <div style={{ marginBottom: '2rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                        Confirm coordinates (Click or drag marker)
                    </label>
                    <div style={{ height: '250px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        {position ? (
                            <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution="&copy; OpenStreetMap contributors"
                                />
                                <LocationMarker position={position} setPosition={setPosition} />
                            </MapContainer>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                                Detecting location...
                            </div>
                        )}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Select Category</label>
                        <select
                            className="form-control"
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            required
                        >
                            <option value="" disabled>Choose category...</option>
                            <option value="Dry Waste">Dry Waste</option>
                            <option value="Wet Waste">Wet Waste</option>
                            <option value="Electronic Waste">Electronic Waste</option>
                            <option value="Hazardous">Hazardous</option>
                        </select>
                    </div>

                    <button type="submit" className="btn" disabled={loading || !selectedCategory || !imageBlob || !position} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                        {loading && (
                            <svg width="20" height="20" viewBox="0 0 50 50" style={{ animation: 'spin 1s linear infinite' }}>
                                <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="90 150" strokeLinecap="round" opacity="0.7"></circle>
                                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                            </svg>
                        )}
                        {loading ? 'AI Processing...' : 'Submit Validated Drop'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SubmitWaste;
