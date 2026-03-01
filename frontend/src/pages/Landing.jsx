import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <div className="main-content" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            textAlign: 'center',
            background: 'radial-gradient(circle at center, rgba(212, 175, 55, 0.05) 0%, transparent 70%)',
            animation: 'fadeIn 1s ease-out'
        }}>
            <div className="hero-logo" style={{ marginBottom: '2rem' }}>
                <img
                    src="/logo.png"
                    alt="Zenith Gold X Logo"
                    style={{
                        width: '180px',
                        height: 'auto',
                        filter: 'drop-shadow(0 0 20px rgba(212, 175, 55, 0.3))',
                        animation: 'pulse 3s infinite ease-in-out'
                    }}
                />
            </div>

            <h1 style={{
                fontSize: '3.5rem',
                fontWeight: '800',
                marginBottom: '1rem',
                background: 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-1px'
            }}>
                Zenith Gold X™
            </h1>

            <p style={{
                fontSize: '1.25rem',
                color: 'var(--text-muted)',
                maxWidth: '600px',
                marginBottom: '2.5rem',
                lineHeight: '1.6'
            }}>
                The gold standard in civic infrastructure. Turning waste into rewards through autonomous AI verification and enterprise-grade sustainability.
            </p>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
                <Link to="/register">
                    <button className="btn glow-button" style={{ padding: '0.8rem 2.5rem', fontSize: '1.1rem' }}>
                        Join the Movement
                    </button>
                </Link>
                <Link to="/login">
                    <button className="btn" style={{
                        padding: '0.8rem 2.5rem',
                        fontSize: '1.1rem',
                        background: 'transparent',
                        border: '1px solid var(--primary-color)',
                        color: 'var(--primary-color)'
                    }}>
                        Sign In
                    </button>
                </Link>
            </div>

            <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '900px' }}>
                <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>AI Verified</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Computer vision ensures accurate waste classification and reward distribution.</p>
                </div>
                <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Secure Rewards</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Atomic transactions and economic reserves protect the value of your ZGX.</p>
                </div>
                <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Civic Growth</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Contribute to a cleaner city and unlock exclusive urban gardening rewards.</p>
                </div>
            </div>
        </div>
    );
};

export default Landing;
