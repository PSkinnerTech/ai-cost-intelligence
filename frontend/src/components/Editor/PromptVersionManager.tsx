// src/components/Editor/PromptVersionManager.tsx
// Advanced Prompt Versioning with Git-like Features

import React, { useState, useEffect } from 'react';
import { 
  DocumentDuplicateIcon, 
  TagIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ArrowPathIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

interface PromptVersion {
  id: string;
  name: string;
  version: string;
  template: string;
  description: string;
  tags: string[];
  createdAt: string;
  author: string;
  isStable: boolean;
  performance?: {
    avgCost: number;
    avgLatency: number;
    successRate: number;
  };
}

interface VersionManagerProps {
  promptName: string;
  currentTemplate: string;
  onVersionSelect: (version: PromptVersion) => void;
  onSaveVersion: (version: Omit<PromptVersion, 'id' | 'createdAt'>) => void;
}

const API_BASE = 'http://localhost:3001';

export const PromptVersionManager: React.FC<VersionManagerProps> = ({
  promptName,
  currentTemplate,
  onVersionSelect,
  onSaveVersion
}) => {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state for saving new version
  const [saveForm, setSaveForm] = useState({
    version: '',
    description: '',
    tags: '',
    isStable: false
  });

  useEffect(() => {
    if (promptName) {
      fetchVersions();
    }
  }, [promptName]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      // TODO: Replace with real API when backend implements version management
      // For now, showing empty state with real data message
      setVersions([]);
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVersion = async () => {
    try {
      const newVersion: Omit<PromptVersion, 'id' | 'createdAt'> = {
        name: promptName,
        version: saveForm.version,
        template: currentTemplate,
        description: saveForm.description,
        tags: saveForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        author: 'Current User',
        isStable: saveForm.isStable
      };

      await onSaveVersion(newVersion);
      setShowSaveModal(false);
      setSaveForm({ version: '', description: '', tags: '', isStable: false });
      fetchVersions();
    } catch (error) {
      console.error('Error saving version:', error);
    }
  };

  const handleVersionToggle = (versionId: string) => {
    setSelectedVersions(prev => 
      prev.includes(versionId) 
        ? prev.filter(id => id !== versionId)
        : [...prev, versionId].slice(-2) // Max 2 versions for comparison
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVersionStatus = (version: PromptVersion) => {
    if (version.isStable) return { color: 'green', label: 'Stable' };
    if (version.tags.includes('current')) return { color: 'blue', label: 'Current' };
    if (version.tags.includes('experimental')) return { color: 'yellow', label: 'Experimental' };
    return { color: 'gray', label: 'Draft' };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowCompareModal(true)}
              disabled={selectedVersions.length !== 2}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedVersions.length === 2
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Compare ({selectedVersions.length}/2)
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-3 py-1 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Save Version
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {versions.map((version) => {
              const status = getVersionStatus(version);
              const isSelected = selectedVersions.includes(version.id);
              
              return (
                <div
                  key={version.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleVersionToggle(version.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">{version.version}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-800`}>
                          {status.label}
                        </span>
                        {version.isStable && <StarIcon className="h-4 w-4 text-yellow-400" />}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{version.description}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatDate(version.createdAt)}
                        </span>
                        <span>{version.author}</span>
                        {version.performance && (
                          <span className="flex items-center space-x-2">
                            <span>${version.performance.avgCost.toFixed(4)}</span>
                            <span>{version.performance.avgLatency}ms</span>
                            <span>{version.performance.successRate}%</span>
                          </span>
                        )}
                      </div>
                      
                      {version.tags.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          <TagIcon className="h-3 w-3 text-gray-400" />
                          {version.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVersionSelect(version);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Load
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle clone logic
                        }}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Clone
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Version Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Save New Version</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Version Number
                </label>
                <input
                  type="text"
                  value={saveForm.version}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="e.g., v1.3.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={saveForm.description}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the changes in this version..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={saveForm.tags}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., stable, production, tested"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isStable"
                  checked={saveForm.isStable}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, isStable: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isStable" className="ml-2 text-sm text-gray-700">
                  Mark as stable version
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVersion}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptVersionManager; 