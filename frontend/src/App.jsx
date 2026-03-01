import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SubmitWaste from './pages/SubmitWaste';
import PendingWaste from './pages/PendingWaste';
import Leaderboard from './pages/Leaderboard';
import AdminDashboard from './pages/AdminDashboard';
import GardenCapture from './pages/GardenCapture';
import Landing from './pages/Landing';
import ProtectedRoute from './components/ProtectedRoute';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#fff', textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ color: '#d4af37', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ color: '#a0a0a0', marginBottom: '1.5rem' }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button className="btn" onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="app-container">
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/leaderboard" element={<Leaderboard />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/submit-waste"
                element={
                  <ProtectedRoute allowedRoles={['Citizen']}>
                    <SubmitWaste />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/garden"
                element={
                  <ProtectedRoute allowedRoles={['Citizen']}>
                    <GardenCapture />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pending-waste"
                element={
                  <ProtectedRoute allowedRoles={['Worker']}>
                    <PendingWaste />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
