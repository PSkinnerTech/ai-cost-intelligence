import React, { useState, useEffect } from 'react';

const Header: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
    } catch (error) {
      setBackendStatus('disconnected');
    }
  };

  const getStatusColor = () => {
    switch (backendStatus) {
      case 'connected': return '#10B981';
      case 'disconnected': return '#EF4444';
      case 'checking': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (backendStatus) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  return (
    <header style={{
      backgroundColor: '#1F2937',
      color: 'white',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #374151'
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
          🧪 A/B Testing GUI
        </h1>
        <p style={{ margin: '0.25rem 0 0 0', color: '#9CA3AF', fontSize: '0.875rem' }}>
          Real-time LLM Prompt Testing with Cost Tracking
        </p>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Backend Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor()
          }} />
          <span style={{ fontSize: '0.875rem' }}>
            Backend: {getStatusText()}
          </span>
        </div>

        {/* Phoenix Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: backendStatus === 'connected' ? '#10B981' : '#6B7280'
          }} />
          <span style={{ fontSize: '0.875rem' }}>
            📊 Phoenix
          </span>
        </div>

        {/* Arize Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: backendStatus === 'connected' ? '#10B981' : '#6B7280'
          }} />
          <span style={{ fontSize: '0.875rem' }}>
            🌐 Arize
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header; 