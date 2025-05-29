// src/components/Editor/PromptEditor.tsx
// Monaco-based Prompt Editor with Variable Highlighting and Real-time Preview

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import axios from 'axios';
import { calculateRealCost } from '../../config/pricing';

// Types for our prompt management
interface PromptVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required: boolean;
}

interface PromptVariant {
  id?: string;
  name: string;
  description: string;
  template: string;
  variables: PromptVariable[];
  model: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  tags: string[];
}

interface PromptEditorProps {
  variant?: PromptVariant;
  onSave?: (variant: PromptVariant) => void;
  onChange?: (variant: PromptVariant) => void;
  mode?: 'single' | 'comparison';
  showPreview?: boolean;
}

const API_BASE = 'http://localhost:3001';

export const PromptEditor: React.FC<PromptEditorProps> = ({
  variant: initialVariant,
  onSave,
  onChange,
  mode = 'single',
  showPreview = true
}) => {
  // State management
  const [variant, setVariant] = useState<PromptVariant>(
    initialVariant || {
      name: 'New Prompt',
      description: 'Enter your prompt description',
      template: 'Hi {{name}}, can you help me understand {{topic}}? I\'d like to learn more about it.',
      variables: [
        { name: 'name', description: 'Assistant name', defaultValue: 'Assistant', required: true },
        { name: 'topic', description: 'Topic of interest', defaultValue: 'AI', required: true }
      ],
      model: 'gpt-3.5-turbo',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 1.0,
        frequencyPenalty: 0,
        presencePenalty: 0
      },
      tags: []
    }
  );

  const [preview, setPreview] = useState<string>('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Initialize variables from template
  useEffect(() => {
    const initialVars: Record<string, string> = {};
    variant.variables.forEach(variable => {
      initialVars[variable.name] = variable.defaultValue || '';
    });
    setVariables(initialVars);
  }, [variant.variables]);

  // Extract variables from template using our backend service
  const extractVariables = useCallback(async (template: string) => {
    try {
      const response = await axios.post(`${API_BASE}/api/prompts/interpolate`, {
        template,
        variables: {}
      });
      
      if (response.data.success) {
        const extractedVars = response.data.variables.map((v: any) => ({
          name: v.name,
          description: v.description || `Variable: ${v.name}`,
          defaultValue: variables[v.name] || '',
          required: true
        }));

        setVariant(prev => ({ ...prev, variables: extractedVars }));
      }
    } catch (error) {
      console.error('Error extracting variables:', error);
    }
  }, [variables]);

  // Update preview using backend interpolation
  const updatePreview = useCallback(async () => {
    try {
      const response = await axios.post(`${API_BASE}/api/prompts/interpolate`, {
        template: variant.template,
        variables
      });
      
      if (response.data.success) {
        setPreview(response.data.interpolated);
        setErrors([]);
      }
    } catch (error: any) {
      setPreview('Error in template');
      setErrors([error.response?.data?.error || 'Template interpolation failed']);
    }
  }, [variant.template, variables]);

  // Update preview when template or variables change
  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  // Handle template changes
  const handleTemplateChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      const updatedVariant = { ...variant, template: value };
      setVariant(updatedVariant);
      
      // Extract variables from new template
      extractVariables(value);
      
      // Notify parent of changes
      onChange?.(updatedVariant);
    }
  }, [variant, extractVariables, onChange]);

  // Handle variable value changes
  const handleVariableChange = useCallback((varName: string, value: string) => {
    setVariables(prev => ({ ...prev, [varName]: value }));
  }, []);

  // Handle variant metadata changes
  const handleVariantChange = useCallback((field: keyof PromptVariant, value: any) => {
    const updatedVariant = { ...variant, [field]: value };
    setVariant(updatedVariant);
    onChange?.(updatedVariant);
  }, [variant, onChange]);

  // Save variant to backend
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const response = await axios.post(`${API_BASE}/api/prompts`, variant);
      
      if (response.data.success) {
        const savedVariant = response.data.variant;
        setVariant(savedVariant);
        onSave?.(savedVariant);
        console.log('✅ Prompt saved successfully:', savedVariant.id);
      }
    } catch (error: any) {
      console.error('❌ Error saving prompt:', error);
      setErrors([error.response?.data?.error || 'Failed to save prompt']);
    } finally {
      setSaving(false);
    }
  }, [variant, onSave]);

  // Test prompt with real OpenAI call
  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await axios.post(`${API_BASE}/api/test/openai`, {
        message: preview
      });
      
      if (response.data.success) {
        setTestResult(response.data.data);
        console.log('✅ Test completed:', response.data.data);
      }
    } catch (error: any) {
      console.error('❌ Test failed:', error);
      setErrors([error.response?.data?.error || 'Test execution failed']);
    } finally {
      setTesting(false);
    }
  }, [preview]);

  // Monaco editor configuration
  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Configure Monaco for prompt templates
    editor.updateOptions({
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
    });

    // Add custom decorations for variables
    const model = editor.getModel();
    if (model) {
      // Highlight {{variable}} patterns
      const variableRegex = /\{\{[^}]+\}\}/g;
      const text = model.getValue();
      const decorations: editor.IModelDeltaDecoration[] = [];
      
      let match;
      while ((match = variableRegex.exec(text)) !== null) {
        const startPos = model.getPositionAt(match.index);
        const endPos = model.getPositionAt(match.index + match[0].length);
        
        decorations.push({
          range: {
            startLineNumber: startPos.lineNumber,
            startColumn: startPos.column,
            endLineNumber: endPos.lineNumber,
            endColumn: endPos.column
          },
          options: {
            className: 'variable-highlight',
            hoverMessage: { value: 'Prompt Variable' }
          }
        });
      }
      
      editor.deltaDecorations([], decorations);
    }
  }, []);

  // Calculate real cost using actual token usage when available
  const realCost = testResult?.usage ? calculateRealCost(testResult.usage, testResult.model || 'gpt-3.5-turbo') : null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={variant.name}
              onChange={(e) => handleVariantChange('name', e.target.value)}
              className="text-xl font-semibold bg-transparent border-none outline-none hover:bg-gray-50 px-2 py-1 rounded"
              placeholder="Prompt Name"
            />
            <input
              type="text"
              value={variant.description}
              onChange={(e) => handleVariantChange('description', e.target.value)}
              className="block text-sm text-gray-600 bg-transparent border-none outline-none hover:bg-gray-50 px-2 py-1 rounded mt-1 w-full"
              placeholder="Prompt Description"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleTest}
              disabled={testing || !preview}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {testing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <span>🧪</span>
                  <span>Test</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Editor and Preview Layout */}
      <div className="flex-1 flex">
        {/* Left Panel: Template Editor */}
        <div className="flex-1 flex flex-col">
          <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">Prompt Template</h3>
          </div>
          
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="text"
              value={variant.template}
              onChange={handleTemplateChange}
              onMount={handleEditorDidMount}
              options={{
                wordWrap: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                theme: 'vs-light'
              }}
            />
          </div>
        </div>

        {/* Right Panel: Variables and Preview */}
        {showPreview && (
          <div className="w-1/2 border-l border-gray-200 flex flex-col">
            {/* Variables Section */}
            <div className="border-b border-gray-200 p-4 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Variables</h3>
              <div className="space-y-3">
                {variant.variables.map((variable) => (
                  <div key={variable.name} className="flex flex-col space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      {variable.name} {variable.required && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={variables[variable.name] || ''}
                      onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                      placeholder={variable.defaultValue || `Enter ${variable.name}`}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {variable.description && (
                      <span className="text-xs text-gray-500">{variable.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Section */}
            <div className="flex-1 flex flex-col">
              <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700">Live Preview</h3>
              </div>
              
              <div className="flex-1 p-4 overflow-auto">
                <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                  {preview || 'Preview will appear here...'}
                </div>
              </div>
            </div>

            {/* Test Results */}
            {testResult && (
              <div className="border-t border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Test Result</h3>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-sm mb-2">
                    <strong>Cost:</strong> ${(
                      (testResult.usage?.prompt_tokens || 0) * 0.0005/1000 + 
                      (testResult.usage?.completion_tokens || 0) * 0.0015/1000
                    ).toFixed(6)}
                  </div>
                  <div className="text-sm mb-2">
                    <strong>Tokens:</strong> {testResult.usage?.total_tokens || 0}
                  </div>
                  <div className="text-xs text-gray-600 max-h-32 overflow-auto">
                    {testResult.response}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">Estimated Cost</span>
                    <span className="text-lg font-bold text-green-600">
                      ${realCost ? realCost.totalCost.toFixed(6) : '0.000000'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-green-600">
                    Real calculation based on actual token usage
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="border-t border-red-200 bg-red-50 p-4">
          <div className="text-red-800 text-sm">
            {errors.map((error, index) => (
              <div key={index}>❌ {error}</div>
            ))}
          </div>
        </div>
      )}

      {/* Custom CSS for variable highlighting */}
      <style>{`
        .variable-highlight {
          background-color: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default PromptEditor; 