import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Session {
  id: string;
  createdAt: string;
  status: string;
  metadata?: any;
}

const SessionMonitor: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSessionMetadata, setNewSessionMetadata] = useState('');

  const fetchSession = async (sessionId: string) => {
    try {
      const response = await axios.get(`http://localhost:3001/api/sessions/${sessionId}`);
      return response.data.session;
    } catch (err) {
      console.error('Error fetching session:', err);
      return null;
    }
  };

  const createSession = async () => {
    setLoading(true);
    setError(null);

    try {
      let metadata = {};
      if (newSessionMetadata.trim()) {
        try {
          metadata = JSON.parse(newSessionMetadata);
        } catch {
          metadata = { description: newSessionMetadata };
        }
      }

      const response = await axios.post('http://localhost:3001/api/sessions', {
        metadata: {
          ...metadata,
          source: 'session-monitor',
          userAgent: 'frontend-ui'
        }
      });

      if (response.data.success) {
        setSessions(prev => [response.data.session, ...prev]);
        setNewSessionMetadata('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = async () => {
    // Refresh existing sessions (in a real app, you'd have a list endpoint)
    setSessions(prev => prev.map(session => ({ ...session, status: 'active' })));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ 
          margin: '0 0 0.5rem 0', 
          fontSize: '1.875rem', 
          fontWeight: 'bold',
          color: '#1F2937'
        }}>
          📝 Session Monitor
        </h2>
        <p style={{ color: '#6B7280', margin: 0 }}>
          Track and manage conversation sessions with metadata
        </p>
      </div>

      {/* Create New Session */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#1F2937',
          marginBottom: '1rem'
        }}>
          ➕ Create New Session
        </h3>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Session Metadata (JSON or description):
          </label>
          <textarea
            value={newSessionMetadata}
            onChange={(e) => setNewSessionMetadata(e.target.value)}
            placeholder='{"testType": "user-feedback", "version": "1.0"} or just "User feedback session"'
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Leave empty for a basic session with default metadata
          </div>
          <button
            onClick={createSession}
            disabled={loading}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: loading ? '#9CA3AF' : '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {loading ? '🔄 Creating...' : '✨ Create Session'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '2rem',
          color: '#991B1B'
        }}>
          <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Error:</div>
          <div>{error}</div>
        </div>
      )}

      {/* Sessions List */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1F2937',
            margin: 0
          }}>
            📋 Active Sessions
          </h3>
          <button
            onClick={refreshSessions}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {sessions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6B7280',
            backgroundColor: '#F9FAFB',
            borderRadius: '0.75rem',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📱</div>
            <div>No sessions created yet. Create your first session above!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {sessions.map((session) => (
              <div key={session.id} style={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '0.75rem',
                padding: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <h4 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#1F2937',
                      margin: '0 0 0.25rem 0'
                    }}>
                      Session {session.id.substring(0, 8)}...
                    </h4>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6B7280'
                    }}>
                      Created: {new Date(session.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: session.status === 'active' ? '#ECFDF5' : '#F3F4F6',
                    color: session.status === 'active' ? '#059669' : '#6B7280',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}>
                    {session.status}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                      Session ID
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                      backgroundColor: '#F3F4F6',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      color: '#1F2937'
                    }}>
                      {session.id}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                      Source
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1F2937' }}>
                      {session.metadata?.source || 'Unknown'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                      User Agent
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1F2937' }}>
                      {session.metadata?.userAgent || 'Unknown'}
                    </div>
                  </div>
                </div>

                {/* Metadata Display */}
                {session.metadata && Object.keys(session.metadata).length > 0 && (
                  <div style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '0.5rem',
                    padding: '1rem'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Metadata:
                    </div>
                    <pre style={{
                      fontSize: '0.75rem',
                      color: '#1F2937',
                      margin: 0,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {JSON.stringify(session.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Stats */}
      {sessions.length > 0 && (
        <div style={{
          marginTop: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #DBEAFE',
            borderRadius: '0.5rem',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#1E40AF', marginBottom: '0.25rem' }}>
              Total Sessions
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E40AF' }}>
              {sessions.length}
            </div>
          </div>

          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '0.5rem',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#059669', marginBottom: '0.25rem' }}>
              Active Sessions
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
              {sessions.filter(s => s.status === 'active').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionMonitor; 