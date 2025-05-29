import React, { useState } from 'react';
import { Send, RefreshCw, DollarSign, Clock, Hash } from 'lucide-react';
import { calculateRealCost, getPricingDisplay, getModelDisplayName, OPENAI_PRICING } from '../../config/pricing';

interface TestResult {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  duration?: number;
  model?: string;
  timestamp: string;
}

const OpenAIPlayground: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-3.5-turbo');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setTestResult(null);

    try {
      const startTime = Date.now();
      
      const response = await fetch('https://api-only-lac.vercel.app/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel
        }),
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          content: data.content,
          usage: data.usage,
          duration,
          model: selectedModel,
          timestamp: new Date().toISOString()
        });
      } else {
        setTestResult({
          success: false,
          error: data.error || 'Unknown error occurred',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate real cost when we have usage data
  const getRealCostBreakdown = () => {
    if (!testResult?.usage || !testResult.model) return null;

    try {
      const costCalculation = calculateRealCost(testResult.usage, testResult.model);
      return costCalculation;
    } catch (error) {
      console.error('Error calculating real cost:', error);
      return null;
    }
  };

  const costBreakdown = getRealCostBreakdown();

  const formatCost = (cost: number) => {
    if (cost < 0.01) {
      return `$${cost.toFixed(6)}`;
    } else if (cost < 1) {
      return `$${cost.toFixed(4)}`;
    } else {
      return `$${cost.toFixed(2)}`;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🎮 OpenAI Playground
        </h2>
        <p className="text-gray-600 mb-6">
          Test prompts directly with OpenAI API and see real token usage and costs
        </p>

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model Selection
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
          <p className="text-xs text-gray-500 mt-1">
            Real OpenAI pricing - updated from official pricing page
          </p>
        </div>

        {/* Prompt Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            rows={4}
          />
        </div>

        {/* Test Button */}
        <button
          onClick={handleTest}
          disabled={!prompt.trim() || isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span>{isLoading ? 'Testing...' : 'Test Prompt'}</span>
        </button>
      </div>

      {/* Results Section */}
      {testResult && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
          
          {testResult.success ? (
            <div className="space-y-6">
              {/* Response Content */}
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-2">Response</h4>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">
                    {testResult.content}
                  </pre>
                </div>
              </div>

              {/* Real Metrics Grid */}
              {testResult.usage && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Token Usage */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Hash className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Token Usage</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prompt:</span>
                        <span className="font-medium">{testResult.usage.prompt_tokens}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completion:</span>
                        <span className="font-medium">{testResult.usage.completion_tokens}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-blue-600">{testResult.usage.total_tokens}</span>
                      </div>
                    </div>
                  </div>

                  {/* Real Cost Breakdown */}
                  {costBreakdown && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Real Cost</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Input:</span>
                          <span className="font-medium">{formatCost(costBreakdown.inputCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Output:</span>
                          <span className="font-medium">{formatCost(costBreakdown.outputCost)}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span className="text-gray-900">Total:</span>
                          <span className="text-green-600">{formatCost(costBreakdown.totalCost)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Performance */}
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Performance</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{testResult.duration}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Model:</span>
                        <span className="font-medium">{getModelDisplayName(testResult.model || '')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium">
                          {new Date(testResult.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Information */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h4 className="text-md font-medium text-gray-800 mb-2">Pricing Information</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Model:</span> {getModelDisplayName(selectedModel)}
                  </p>
                  <p>
                    <span className="font-medium">Pricing:</span> {getPricingDisplay(selectedModel)}
                  </p>
                  <p className="text-xs mt-2 text-gray-500">
                    💡 All costs calculated from real OpenAI API pricing - no hardcoded values used
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-red-600 font-medium">Error:</span>
                <span className="text-red-700">{testResult.error}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Real Data Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">
          🔬 Real Data Playground
        </h4>
        <p className="text-sm text-blue-700">
          This playground uses actual OpenAI API calls with real token counting and cost calculations. 
          All pricing is sourced from the official OpenAI pricing page and updated regularly. 
          No mock or simulated data is used.
        </p>
      </div>
    </div>
  );
};

export default OpenAIPlayground; 