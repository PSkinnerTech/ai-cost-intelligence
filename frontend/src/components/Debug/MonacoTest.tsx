// src/components/Debug/MonacoTest.tsx
// Simple Monaco Editor Test Component

import React, { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

const API_BASE = 'http://localhost:3001';

export const MonacoTest: React.FC = () => {
  const [template, setTemplate] = useState<string>('Hello {{name}}, welcome to {{topic}}!');
  const [variables, setVariables] = useState<Record<string, string>>({
    name: 'Alice',
    topic: 'Monaco Testing'
  });
  const [preview, setPreview] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [backendStatus, setBackendStatus] = useState<string>('checking');

  // Test backend connectivity
  const testBackend = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/health`);
      setBackendStatus(response.data.status || 'connected');
      console.log('✅ Backend health check:', response.data);
    } catch (error: any) {
      setBackendStatus('error');
      console.error('❌ Backend health check failed:', error);
    }
  }, []);

  // Test interpolation
  const testInterpolation = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Testing interpolation with:', { template, variables });
      
      const response = await axios.post(`${API_BASE}/api/prompts/interpolate`, {
        template,
        variables
      });

      console.log('✅ Interpolation response:', response.data);
      
      if (response.data.success) {
        setPreview(response.data.interpolated);
        setError('');
      } else {
        setError('Interpolation failed: no success flag');
      }
    } catch (error: any) {
      console.error('❌ Interpolation failed:', error);
      setError(error.response?.data?.error || error.message || 'Request failed');
      setPreview('');
    } finally {
      setLoading(false);
    }
  }, [template, variables]);

  // Monaco editor mount handler
  const handleEditorDidMount = useCallback((editor: any) => {
    console.log('✅ Monaco editor mounted successfully');
    editor.focus();
  }, []);

  // Test backend connectivity on mount
  useEffect(() => {
    testBackend();
  }, [testBackend]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔧 Monaco & API Debug Test</h1>
      
      {/* Backend Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Backend Status</h2>
          <button
            onClick={testBackend}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Backend
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            backendStatus === 'healthy' ? 'bg-green-500' : 
            backendStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="font-medium">
            Backend: {backendStatus === 'healthy' ? 'Connected' : backendStatus}
          </span>
        </div>
      </div>

      {/* Monaco Editor Test */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Monaco Editor Test</h2>
        <div className="border border-gray-300 rounded-lg" style={{ height: '200px' }}>
          <Editor
            height="200px"
            defaultLanguage="text"
            value={template}
            onChange={(value) => setTemplate(value || '')}
            onMount={handleEditorDidMount}
            options={{
              wordWrap: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
            }}
          />
        </div>
      </div>

      {/* Variables Input */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Variables</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">name</label>
            <input
              type="text"
              value={variables.name}
              onChange={(e) => setVariables(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">topic</label>
            <input
              type="text"
              value={variables.topic}
              onChange={(e) => setVariables(prev => ({ ...prev, topic: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Test Button */}
      <div className="mb-6">
        <button
          onClick={testInterpolation}
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Testing...</span>
            </>
          ) : (
            <>
              <span>🧪</span>
              <span>Test Interpolation</span>
            </>
          )}
        </button>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Preview */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Preview Result</h2>
          <div className="p-4 bg-gray-50 rounded-lg font-mono text-sm min-h-[100px]">
            {preview || 'Preview will appear here...'}
          </div>
        </div>

        {/* Error/Debug */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <div className="p-4 bg-gray-50 rounded-lg text-sm min-h-[100px]">
            {error ? (
              <div className="text-red-600">
                <strong>Error:</strong> {error}
              </div>
            ) : (
              <div className="text-green-600">
                <strong>Status:</strong> Ready for testing
                <br />
                <strong>API Base:</strong> {API_BASE}
                <br />
                <strong>Template:</strong> {template.length} characters
                <br />
                <strong>Variables:</strong> {Object.keys(variables).length} defined
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raw Data */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Raw Request Data</h2>
        <pre className="p-4 bg-black text-green-400 rounded-lg text-sm overflow-auto">
          {JSON.stringify({ template, variables }, null, 2)}
        </pre>
      </div>

      {/* CSS Debug Info */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">CSS Debug Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Tailwind Test</h3>
            <div className="space-y-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <p className="text-sm text-blue-800">If you see colored squares above, Tailwind is working!</p>
            </div>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-medium text-yellow-900 mb-2">Layout Test</h3>
            <div className="flex space-x-2">
              <div className="flex-1 h-4 bg-yellow-300 rounded"></div>
              <div className="flex-1 h-4 bg-yellow-400 rounded"></div>
              <div className="flex-1 h-4 bg-yellow-500 rounded"></div>
            </div>
            <p className="text-sm text-yellow-800 mt-2">Flexbox and spacing test</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonacoTest; 