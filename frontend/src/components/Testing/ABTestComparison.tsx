// src/components/Testing/ABTestComparison.tsx
// Side-by-Side A/B Testing Interface with Dataset Upload and Real-time Execution

import React, { useState, useCallback, useEffect } from 'react';
import PromptEditor from '../Editor/PromptEditor';
import BusinessResultsPanel from './BusinessResultsPanel';
import axios from 'axios';

interface TestInput {
  id?: string;
  prompt: string;
  variables: Record<string, string>;
  expectedOutput?: string;
  category?: string;
}

interface TestResult {
  id: string;
  variantId: string;
  inputId: string;
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: {
    promptCost: number;
    completionCost: number;
    totalCost: number;
  };
  metrics: {
    latency: number;
    timestamp: string;
    sessionId: string;
    traceId?: string;
  };
}

interface ComparisonResult {
  variantA: {
    result: TestResult;
    metrics: {
      avgCost: number;
      avgLatency: number;
      totalSamples: number;
    };
  };
  variantB: {
    result: TestResult;
    metrics: {
      avgCost: number;
      avgLatency: number;
      totalSamples: number;
    };
  };
  statistical?: {
    significant: boolean;
    pValue: number;
    winner?: string;
    reasoning: string;
  };
}

const API_BASE = 'http://localhost:3001';

export const ABTestComparison: React.FC = () => {
  // State for the two variants being compared
  const [variantA, setVariantA] = useState<any>({
    name: 'Variant A - Direct Style',
    description: 'Concise, direct responses optimized for cost',
    template: 'What is {{topic}}? Give me a brief overview.',
    variables: [{ name: 'topic', required: true, defaultValue: '' }],
    model: 'gpt-3.5-turbo',
    parameters: { temperature: 0.3, maxTokens: 100 },
    tags: ['direct', 'cost-optimized']
  });

  const [variantB, setVariantB] = useState<any>({
    name: 'Variant B - Explanatory Style',
    description: 'Detailed, comprehensive responses with examples',
    template: 'Can you explain {{topic}} to me? I\'d like to understand it thoroughly with examples and real-world applications.',
    variables: [{ name: 'topic', required: true, defaultValue: '' }],
    model: 'gpt-3.5-turbo',
    parameters: { temperature: 0.7, maxTokens: 300 },
    tags: ['explanatory', 'comprehensive']
  });

  // Test execution state
  const [testInputs, setTestInputs] = useState<TestInput[]>([
    {
      prompt: 'What is artificial intelligence? Give me a brief overview.',
      variables: { topic: 'artificial intelligence' },
      category: 'tech-qa'
    },
    {
      prompt: 'Can you explain neural networks to me?',
      variables: { topic: 'neural networks' },
      category: 'tech-qa'
    },
    {
      prompt: 'What are the benefits of cloud computing?',
      variables: { topic: 'cloud computing' },
      category: 'tech-qa'
    }
  ]);

  const [selectedInput, setSelectedInput] = useState<TestInput | null>(null);
  const [running, setRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<any>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  // File upload handling
  const [dragActive, setDragActive] = useState(false);

  // Initialize with first input
  useEffect(() => {
    if (testInputs.length > 0 && !selectedInput) {
      setSelectedInput(testInputs[0]);
    }
  }, [testInputs, selectedInput]);

  // Handle variant changes
  const handleVariantAChange = useCallback((variant: any) => {
    setVariantA(variant);
  }, []);

  const handleVariantBChange = useCallback((variant: any) => {
    setVariantB(variant);
  }, []);

  // Handle dataset upload via drag & drop or file picker
  const handleFileUpload = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    try {
      const text = await file.text();
      let newInputs: TestInput[] = [];

      if (file.name.endsWith('.json')) {
        // JSON format
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          newInputs = data.map((item, index) => ({
            prompt: item.prompt || item.question || item.input || '',
            variables: item.variables || { topic: item.prompt || item.question || item.input || '' },
            expectedOutput: item.expected || item.output,
            category: item.category || 'uploaded'
          }));
        }
      } else if (file.name.endsWith('.csv')) {
        // CSV format - simple parsing
        const lines = text.split('\n').filter(line => line.trim());
        
        newInputs = lines.slice(1).map((line, index) => {
          const values = line.split(',').map(v => v.trim());
          const prompt = values[0] || '';
          return {
            prompt,
            variables: { topic: prompt },
            category: 'uploaded'
          };
        });
      } else {
        // Plain text - one question per line
        const lines = text.split('\n').filter(line => line.trim());
        newInputs = lines.map(line => ({
          prompt: line.trim(),
          variables: { topic: line.trim() },
          category: 'uploaded'
        }));
      }

      setTestInputs(newInputs);
      console.log(`✅ Uploaded ${newInputs.length} test inputs from ${file.name}`);
      
    } catch (error) {
      console.error('❌ Error uploading file:', error);
    }
  }, []);

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  // Run single comparison
  const runSingleComparison = useCallback(async (input: TestInput) => {
    if (!variantA.id || !variantB.id) {
      console.error('Both variants must be saved before running comparison');
      return;
    }

    setRunning(true);
    try {
      const response = await axios.post(`${API_BASE}/api/ab-tests/compare`, {
        variantAId: variantA.id,
        variantBId: variantB.id,
        inputId: input.id
      });

      if (response.data.success) {
        const comparison = response.data.comparison;
        console.log('✅ Comparison completed:', comparison);
      }
    } catch (error: any) {
      console.error('❌ Comparison failed:', error);
    } finally {
      setRunning(false);
    }
  }, [variantA.id, variantB.id]);

  // Run full A/B test
  const runFullABTest = useCallback(async () => {
    setRunning(true);
    setProgress({ completed: 0, total: testInputs.length * 2 });

    try {
      // Ensure variants are saved and get the saved objects with IDs
      let savedVariantA = variantA;
      let savedVariantB = variantB;

      if (!variantA.id || !variantB.id) {
        console.log('Saving variants before test execution...');
        try {
          const [responseA, responseB] = await Promise.all([
            axios.post(`${API_BASE}/api/prompts`, variantA),
            axios.post(`${API_BASE}/api/prompts`, variantB)
          ]);
          
          if (responseA.data.success && responseB.data.success) {
            savedVariantA = responseA.data.variant;
            savedVariantB = responseB.data.variant;
            setVariantA(savedVariantA);
            setVariantB(savedVariantB);
            console.log('✅ Variants saved successfully:', savedVariantA.id, savedVariantB.id);
          }
        } catch (error) {
          console.error('❌ Error saving variants:', error);
          setRunning(false);
          return;
        }
      }

      // Create test inputs in backend
      console.log('📝 Creating test inputs...');
      const inputPromises = testInputs.map(input => 
        axios.post(`${API_BASE}/api/test-inputs`, input)
      );
      const inputResponses = await Promise.all(inputPromises);
      const savedInputs = inputResponses.map(r => r.data.input);
      console.log('✅ Test inputs created:', savedInputs.length);

      // Create A/B test with the saved variant IDs
      console.log('🧪 Creating A/B test...');
      const testPayload = {
        name: `${savedVariantA.name} vs ${savedVariantB.name}`,
        description: 'Side-by-side comparison test',
        variantIds: [savedVariantA.id, savedVariantB.id],
        inputIds: savedInputs.map(input => input.id),
        configuration: {
          minSampleSize: Math.min(testInputs.length, 10),
          confidenceLevel: 0.95,
          trafficSplit: [50, 50],
          maxDuration: 300000,
          stopOnSignificance: false,
          primaryMetric: 'cost'
        }
      };

      console.log('📊 Test payload:', testPayload);
      const testResponse = await axios.post(`${API_BASE}/api/ab-tests`, testPayload);

      if (testResponse.data.success) {
        const test = testResponse.data.test;
        setCurrentTest(test);
        console.log('✅ A/B test created:', test.id);

        // Start the test
        console.log('🚀 Starting A/B test execution...');
        await axios.post(`${API_BASE}/api/ab-tests/${test.id}/start`);

        // Monitor progress
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await axios.get(`${API_BASE}/api/ab-tests/${test.id}/execution`);
            const execution = statusResponse.data.execution;
            
            setProgress({
              completed: execution.progress.completed,
              total: execution.progress.total
            });

            if (execution.status === 'completed') {
              clearInterval(pollInterval);
              
              // Get final results
              const resultsResponse = await axios.get(`${API_BASE}/api/ab-tests/${test.id}/results`);
              const testResults = resultsResponse.data.results;
              
              console.log('✅ A/B test completed:', testResults);
              setCurrentTest(testResults);
              setRunning(false);
            }
          } catch (error) {
            console.error('Error polling test status:', error);
          }
        }, 2000);

        // Cleanup interval after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setRunning(false);
        }, 300000);
      }
    } catch (error: any) {
      console.error('❌ A/B test failed:', error);
      console.error('Error details:', error.response?.data);
      setRunning(false);
    }
  }, [variantA, variantB, testInputs]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">A/B Test Comparison</h1>
            <p className="text-gray-600 mt-1">Compare prompt variants side-by-side with real-time execution</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => selectedInput && runSingleComparison(selectedInput)}
              disabled={running || !selectedInput}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Test Selected</span>
            </button>
            
            <button
              onClick={runFullABTest}
              disabled={running || testInputs.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {running ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Running... ({progress.completed}/{progress.total})</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Run Full A/B Test</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section: Compact Test Setup */}
        <div className="h-64 flex border-b border-gray-200 flex-shrink-0">
          {/* Left Panel: Test Data - Much Smaller */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            {/* Dataset Upload - Compact */}
            <div className="border-b border-gray-200 p-3 flex-shrink-0">
              <h3 className="text-xs font-medium text-gray-700 mb-2">Test Dataset</h3>
              
              <div
                className={`border-2 border-dashed rounded-lg p-2 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".json,.csv,.txt"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="text-gray-600 text-xs">
                    <span className="text-blue-600 hover:text-blue-500">Upload</span>
                    <br />
                    <span className="text-xs text-gray-500">JSON/CSV/TXT</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Test Inputs List - Compact */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-2">
                <h3 className="text-xs font-medium text-gray-700 mb-2">Inputs ({testInputs.length})</h3>
                <div className="space-y-1">
                  {testInputs.slice(0, 3).map((input, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded border cursor-pointer text-xs ${
                        selectedInput === input 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedInput(input)}
                    >
                      <div className="font-medium text-gray-900 truncate">
                        {input.prompt.slice(0, 30)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Compact Editable Variants */}
          <div className="flex-1 flex min-w-0">
            {/* Variant A - Compact but Editable */}
            <div className="flex-1 border-r border-gray-200 min-w-0 p-3">
              <div className="h-full flex flex-col">
                <h3 className="text-sm font-medium text-gray-900 mb-2">{variantA.name}</h3>
                <textarea
                  value={variantA.template}
                  onChange={(e) => setVariantA({ ...variantA, template: e.target.value })}
                  className="flex-1 text-xs text-gray-700 bg-gray-50 p-2 rounded border resize-none font-mono"
                  placeholder="Enter prompt template..."
                />
              </div>
            </div>

            {/* Variant B - Compact but Editable */}
            <div className="flex-1 min-w-0 p-3">
              <div className="h-full flex flex-col">
                <h3 className="text-sm font-medium text-gray-900 mb-2">{variantB.name}</h3>
                <textarea
                  value={variantB.template}
                  onChange={(e) => setVariantB({ ...variantB, template: e.target.value })}
                  className="flex-1 text-xs text-gray-700 bg-gray-50 p-2 rounded border resize-none font-mono"
                  placeholder="Enter prompt template..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Business Intelligence Results - Full Width with Scrolling */}
        <div className="flex-1 bg-white overflow-y-auto min-h-0">
          <div className="p-6">
            {/* Status indicator */}
            {(running || currentTest) && (
              <div className="mb-4 text-sm text-gray-600">
                Status: {running ? `Running (${progress.completed}/${progress.total})` : 'Completed'} | 
                Test Data: {currentTest ? 'Present' : 'None'}
              </div>
            )}
            
            {/* Business Intelligence Panel */}
            {(currentTest || running) ? (
              <BusinessResultsPanel 
                testResults={currentTest}
                isLoading={running}
                className="w-full"
              />
            ) : (
              <>
                <div className="mb-4 text-sm text-blue-600 bg-blue-50 p-3 rounded">
                  🎯 Demo Mode: Showing sample Business Intelligence Results
                </div>
                
                <BusinessResultsPanel 
                  testResults={{
                    analysis: {
                      variants: [
                        {
                          variantName: 'Variant A',
                          metrics: { avgCost: 0.000039, avgLatency: 1200, avgTokens: 39 },
                          sampleSize: 2
                        },
                        {
                          variantName: 'Variant B',
                          metrics: { avgCost: 0.000464, avgLatency: 3500, avgTokens: 327 },
                          sampleSize: 2
                        }
                      ],
                      overallWinner: { variantName: 'Variant A' },
                      statisticalSignificance: true,
                      pValue: 0.01,
                      effectSize: 105.98
                    }
                  }}
                  isLoading={false}
                  className="w-full"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ABTestComparison; 