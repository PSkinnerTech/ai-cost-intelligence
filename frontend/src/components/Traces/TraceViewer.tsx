import React, { useState } from 'react';

const TraceViewer: React.FC = () => {
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ 
          margin: '0 0 0.5rem 0', 
          fontSize: '1.875rem', 
          fontWeight: 'bold',
          color: '#1F2937'
        }}>
          🔍 Trace Viewer
        </h2>
        <p style={{ color: '#6B7280', margin: 0 }}>
          Inspect detailed traces and spans from Phoenix and Arize
        </p>
      </div>

      {/* Quick Links */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '0.75rem',
          padding: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontSize: '1.25rem',
              marginRight: '1rem'
            }}>
              📊
            </div>
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1F2937',
                margin: 0
              }}>
                Phoenix Dashboard
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                margin: '0.25rem 0 0 0'
              }}>
                View detailed traces and spans
              </p>
            </div>
          </div>
          
          <button
            onClick={() => window.open('http://localhost:6006', '_blank')}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            🚀 Open Phoenix Dashboard
          </button>
        </div>

        <div style={{
          backgroundColor: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '0.75rem',
          padding: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <div style={{
              backgroundColor: '#F0FDF4',
              color: '#059669',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontSize: '1.25rem',
              marginRight: '1rem'
            }}>
              🌐
            </div>
            <div>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1F2937',
                margin: 0
              }}>
                Arize Platform
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280',
                margin: '0.25rem 0 0 0'
              }}>
                Advanced analytics and monitoring
              </p>
            </div>
          </div>
          
          <button
            onClick={() => window.open('https://app.arize.com', '_blank')}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            🌟 Open Arize Platform
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div style={{
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#1E293B',
          marginBottom: '1rem'
        }}>
          📡 Connection Status
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10B981'
            }} />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1F2937' }}>
                Phoenix Server
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                localhost:6006
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10B981'
            }} />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1F2937' }}>
                Arize Cloud
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                otlp.arize.com
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10B981'
            }} />
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1F2937' }}>
                Backend API
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                localhost:3001
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trace Information */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '0.75rem',
        padding: '1.5rem'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#1F2937',
          marginBottom: '1rem'
        }}>
          🔬 Trace Information
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1rem'
        }}>
          <div style={{
            backgroundColor: '#F8FAFC',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #E2E8F0'
          }}>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '500',
              color: '#1E293B',
              marginBottom: '0.5rem'
            }}>
              📝 How Tracing Works
            </h4>
            <ul style={{
              margin: 0,
              paddingLeft: '1.5rem',
              color: '#64748B',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            }}>
              <li>Every OpenAI API call is automatically traced</li>
              <li>Traces include token usage, costs, and timing data</li>
              <li>Session IDs link related conversations together</li>
              <li>Data is sent to both Phoenix (local) and Arize (cloud)</li>
            </ul>
          </div>

          <div style={{
            backgroundColor: '#FFFBEB',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #FED7AA'
          }}>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '500',
              color: '#92400E',
              marginBottom: '0.5rem'
            }}>
              💡 Pro Tips
            </h4>
            <ul style={{
              margin: 0,
              paddingLeft: '1.5rem',
              color: '#92400E',
              fontSize: '0.875rem',
              lineHeight: '1.6'
            }}>
              <li>Use the Playground to generate traces in real-time</li>
              <li>Check Phoenix for immediate trace visualization</li>
              <li>Arize provides advanced analytics and long-term storage</li>
              <li>Look for session IDs to group related conversations</li>
            </ul>
          </div>

          <div style={{
            backgroundColor: '#EFF6FF',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #DBEAFE'
          }}>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '500',
              color: '#1E40AF',
              marginBottom: '0.5rem'
            }}>
              🚀 Quick Actions
            </h4>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => window.open('http://localhost:6006/projects', '_blank')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                View Projects in Phoenix
              </button>
              <button
                onClick={() => window.open('http://localhost:6006/traces', '_blank')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6366F1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Browse All Traces
              </button>
              <button
                onClick={() => window.open('https://app.arize.com/models', '_blank')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                View Models in Arize
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Future Enhancement Note */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#F3F4F6',
        borderRadius: '0.5rem',
        color: '#6B7280',
        fontSize: '0.875rem',
        textAlign: 'center'
      }}>
        🔮 <strong>Coming Soon:</strong> Embedded trace viewer with search, filtering, and real-time updates
      </div>
    </div>
  );
};

export default TraceViewer; 