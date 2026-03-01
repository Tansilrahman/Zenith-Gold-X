import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav>
            <Link to="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/logo.png" alt="Zenith Gold X Logo" style={{ height: '32px', borderRadius: '4px' }} />
                <span>Zenith Gold X™</span>
            </Link>
            <div className="nav-links">
                {user ? (
                    <>
                        {user.role === 'Admin' && <Link to="/admin"><button className="btn" style={{ background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}>Admin Stats</button></Link>}
                        <Link to="/leaderboard"><button className="btn" style={{ background: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}>Leaderboard</button></Link>
                        <button onClick={handleLogout} className="btn">Sign Out</button>
                    </>
                ) : (
                    <Link to="/login"><button className="btn">Sign In</button></Link>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
