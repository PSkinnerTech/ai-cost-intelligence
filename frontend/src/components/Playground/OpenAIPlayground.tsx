import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../../config/api';

interface OpenAIResponse {
  response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  sessionId: string;
}

const OpenAIPlayground: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<OpenAIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{
    prompt: string;
    response: OpenAIResponse;
    timestamp: Date;
  }>>([]);

  const calculateCost = (usage: OpenAIResponse['usage']) => {
    // GPT-3.5-turbo pricing
    const inputCost = (usage.prompt_tokens / 1000) * 0.0005;
    const outputCost = (usage.completion_tokens / 1000) * 0.0015;
    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost
    };
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) {
      return `$${cost.toFixed(6)}`;
    } else if (cost < 1) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(2)}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(apiUrl('/api/test/openai'), {
        message: prompt
      });

      if (response.data.success) {
        const newResponse = response.data.data;
        setResponse(newResponse);
        setHistory(prev => [...prev, {
          prompt: prompt,
          response: newResponse,
          timestamp: new Date()
        }]);
        setPrompt('');
      } else {
        setError('Failed to get response from OpenAI');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    setResponse(null);
    setError(null);
  };

  const totalCost = history.reduce((sum, item) => {
    const cost = calculateCost(item.response.usage);
    return sum + cost.total;
  }, 0);

  const totalTokens = history.reduce((sum, item) => {
    return sum + item.response.usage.total_tokens;
  }, 0);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ 
          margin: '0 0 0.5rem 0', 
          fontSize: '1.875rem', 
          fontWeight: 'bold',
          color: '#1F2937'
        }}>
          🧪 OpenAI Playground
        </h2>
        <p style={{ color: '#6B7280', margin: 0 }}>
          Test prompts with real-time cost tracking and trace generation
        </p>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #DBEAFE',
          borderRadius: '0.5rem',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#1E40AF', marginBottom: '0.25rem' }}>
            Total Requests
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E40AF' }}>
            {history.length}
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
            Total Tokens
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
            {totalTokens.toLocaleString()}
          </div>
        </div>

        <div style={{
          backgroundColor: '#FFFBEB',
          border: '1px solid #FED7AA',
          borderRadius: '0.5rem',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#D97706', marginBottom: '0.25rem' }}>
            Total Cost
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#D97706' }}>
            {formatCost(totalCost)}
          </div>
        </div>
      </div>

      {/* Prompt Input */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Enter your prompt:
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Type your message here... e.g., 'Explain quantum computing in simple terms'"
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                resize: 'vertical',
                minHeight: '100px'
              }}
            />
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              {prompt.length} characters • ~{Math.ceil(prompt.length / 4)} tokens
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
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
                  Clear History
                </button>
              )}
              
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                style={{
                  padding: '0.5rem 1.5rem',
                  backgroundColor: loading || !prompt.trim() ? '#9CA3AF' : '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                {loading ? '🔄 Sending...' : '🚀 Send'}
              </button>
            </div>
          </div>
        </form>
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

      {/* Response History */}
      <div>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#1F2937',
          marginBottom: '1rem'
        }}>
          📝 Conversation History
        </h3>

        {history.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6B7280',
            backgroundColor: '#F9FAFB',
            borderRadius: '0.75rem',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <div>No conversations yet. Send your first prompt above!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {history.slice().reverse().map((item, index) => {
              const cost = calculateCost(item.response.usage);
              return (
                <div key={index} style={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.75rem',
                  overflow: 'hidden'
                }}>
                  {/* Prompt */}
                  <div style={{
                    backgroundColor: '#F8FAFC',
                    padding: '1rem 1.5rem',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6B7280',
                      marginBottom: '0.5rem'
                    }}>
                      👤 You • {item.timestamp.toLocaleTimeString()}
                    </div>
                    <div style={{ color: '#1F2937' }}>
                      {item.prompt}
                    </div>
                  </div>

                  {/* Response */}
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6B7280',
                      marginBottom: '0.5rem'
                    }}>
                      🤖 Assistant • {item.response.model}
                    </div>
                    <div style={{
                      color: '#1F2937',
                      lineHeight: '1.6',
                      marginBottom: '1rem'
                    }}>
                      {item.response.response}
                    </div>

                    {/* Usage Stats */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '1rem',
                      padding: '1rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}>
                      <div>
                        <div style={{ color: '#6B7280' }}>Tokens</div>
                        <div style={{ fontWeight: '500', color: '#1F2937' }}>
                          {item.response.usage.total_tokens}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7280' }}>Input</div>
                        <div style={{ fontWeight: '500', color: '#1F2937' }}>
                          {item.response.usage.prompt_tokens}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7280' }}>Output</div>
                        <div style={{ fontWeight: '500', color: '#1F2937' }}>
                          {item.response.usage.completion_tokens}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7280' }}>Cost</div>
                        <div style={{ fontWeight: '500', color: '#059669' }}>
                          {formatCost(cost.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OpenAIPlayground; 