import React, { useState } from 'react';
import { RefreshCw, ExternalLink, TrendingUp, AlertCircle, Clock, Hash, DollarSign } from 'lucide-react';
import { getModelDisplayName, getPricingDisplay } from '../../config/pricing';

interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

interface TestResult {
  tokens: TokenUsage;
  cost: number;
  duration: number;
  traceId: string;
  response: string;
  error?: string;
  creditsUsed?: number;
}

interface ApiResponse {
  success: boolean;
  prompt: string;
  model: string;
  results?: {
    direct?: TestResult;
    nevermined?: TestResult;
    savings?: {
      amount: number;
      percentage: number;
    };
  };
  error?: string;
  timestamp: string;
}

const OPENAI_PRICING = {
  'gpt-3.5-turbo': {
    input: 0.0015,
    output: 0.002,
    total: 0.0015 + 0.002
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06,
    total: 0.03 + 0.06
  },
  'gpt-3.5-turbo-mini': {
    input: 0.0001,
    output: 0.0002,
    total: 0.0001 + 0.0002
  }
};

const RealTokenTesting: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<ApiResponse | null>(null);
  const [apiKey, setApiKey] = useState('');

  const handleRunTest = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt to test');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔬 Running real token test...');
      
      const response = await fetch('https://api-only-lac.vercel.app/api/test-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel,
          testMode: 'comparison'
        }),
      });

      const data: ApiResponse = await response.json();
      setTestResult(data);
      
      console.log('📊 Test result:', data);
      
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        prompt,
        model: selectedModel,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderTestResult = (result: TestResult, type: 'Direct OpenAI' | 'Nevermined') => {
    const isError = !!result.error;
    
    return (
      <div className={`bg-white rounded-lg border-2 p-6 ${
        isError ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${
            isError ? 'text-red-800' : 'text-green-800'
          }`}>
            {type} API Call
          </h3>
          {!isError && (
            <span className="text-sm text-gray-600">
              {result.duration}ms
            </span>
          )}
        </div>

        {isError ? (
          <div className="space-y-2">
            <div className="text-red-700 font-medium">❌ Call Failed</div>
            <div className="text-sm text-red-600 bg-red-100 p-3 rounded">
              {result.error}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Token Usage */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{result.tokens.input}</div>
                <div className="text-sm text-gray-600">Input Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{result.tokens.output}</div>
                <div className="text-sm text-gray-600">Output Tokens</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.tokens.total}</div>
                <div className="text-sm text-gray-600">Total Tokens</div>
              </div>
            </div>

            {/* Cost Information */}
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Cost:</span>
                <span className="text-xl font-bold text-green-700">
                  ${result.cost.toFixed(6)}
                </span>
              </div>
              {result.creditsUsed && (
                <div className="flex justify-between items-center mt-2">
                  <span className="font-medium">Credits Used:</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {result.creditsUsed}
                  </span>
                </div>
              )}
            </div>

            {/* Arize Trace Link */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Arize Trace ID:</span>
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                {result.traceId}
              </code>
            </div>

            {/* Response Preview */}
            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">AI Response:</div>
              <div className="bg-gray-50 border rounded p-3 text-sm max-h-32 overflow-y-auto">
                {result.response || 'No response received'}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">🔬 Real Token Testing</h1>
            <div className="text-sm text-gray-600">
              Live API Testing with Arize Tracing
            </div>
          </div>

          {/* Test Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Configuration</h2>
            
            <div className="space-y-4">
              {/* API Key Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-yellow-600 mr-2">⚠️</div>
                  <div>
                    <div className="font-medium text-yellow-800">OpenAI API Key Required</div>
                    <div className="text-sm text-yellow-700 mt-1">
                      Real testing requires a valid OpenAI API key to be configured on the backend.
                      This will make actual API calls and consume tokens.
                    </div>
                  </div>
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.keys(OPENAI_PRICING).map((modelKey) => (
                    <option key={modelKey} value={modelKey}>
                      {getModelDisplayName(modelKey)} - {getPricingDisplay(modelKey)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prompt Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your prompt to test (e.g., 'Explain quantum computing in simple terms')"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                />
              </div>

              {/* Run Test Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleRunTest}
                  disabled={isLoading || !prompt.trim()}
                  className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                    isLoading || !prompt.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? '🔄 Running Tests...' : '🚀 Run Real Token Test'}
                </button>
              </div>
            </div>
          </div>

          {/* Test Results */}
          {testResult && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
              
              {!testResult.success ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 font-medium">❌ Test Failed</div>
                  <div className="text-red-600 mt-2">{testResult.error}</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Test Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-800">Test Prompt:</div>
                        <div className="text-blue-700 mt-1">"{testResult.prompt}"</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-blue-800">Model:</div>
                        <div className="text-blue-700">{testResult.model}</div>
                      </div>
                    </div>
                  </div>

                  {/* API Results Comparison */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {testResult.results?.direct && renderTestResult(testResult.results.direct, 'Direct OpenAI')}
                    {testResult.results?.nevermined && renderTestResult(testResult.results.nevermined, 'Nevermined')}
                  </div>

                  {/* Savings Summary */}
                  {testResult.results?.savings && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-800 mb-4">💰 Cost Savings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">
                            ${testResult.results.savings.amount.toFixed(6)}
                          </div>
                          <div className="text-green-700">Savings Amount</div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">
                            {testResult.results.savings.percentage.toFixed(1)}%
                          </div>
                          <div className="text-green-700">Percentage Saved</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-sm text-gray-500 text-center">
                    Test completed at {new Date(testResult.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTokenTesting; 