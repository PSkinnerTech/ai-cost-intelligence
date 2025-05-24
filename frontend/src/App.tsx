import React, { useState } from 'react';
import './App.css';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import PromptEditor from './components/Editor/PromptEditor';
import ABTestComparison from './components/Testing/ABTestComparison';
import MonacoTest from './components/Debug/MonacoTest';
import CostAnalyticsChart from './components/Dashboard/CostAnalyticsChart';
import CostDashboard from './components/Dashboard/CostDashboard';

function App() {
  const [currentView, setCurrentView] = useState<'editor' | 'comparison' | 'dashboard' | 'debug' | 'analytics'>('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'editor':
        return (
          <div className="h-full">
            <PromptEditor 
              showPreview={true}
              mode="single"
            />
          </div>
        );
      case 'comparison':
        return <ABTestComparison />;
      case 'analytics':
        return (
          <div className="h-full overflow-y-auto bg-gray-50">
            <div className="p-6">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
                  <div className="text-sm text-gray-600">
                    Real-time cost tracking with statistical insights
                  </div>
                </div>
                
                {/* Cost Analytics Chart */}
                <CostAnalyticsChart />
                
                {/* Additional Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Latency</span>
                        <span className="font-semibold">1.2s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Success Rate</span>
                        <span className="font-semibold text-green-600">96.8%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cost per Token</span>
                        <span className="font-semibold">$0.000015</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">A/B Test Results</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tests Completed</span>
                        <span className="font-semibold">23</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Significant Results</span>
                        <span className="font-semibold text-blue-600">18</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Improvement</span>
                        <span className="font-semibold text-green-600">34%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Savings</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Savings</span>
                        <span className="font-semibold text-green-600">$127.45</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Efficiency Gain</span>
                        <span className="font-semibold">284%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ROI</span>
                        <span className="font-semibold text-purple-600">8.2x</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add some bottom spacing for better scrolling */}
                <div className="h-8"></div>
              </div>
            </div>
          </div>
        );
      case 'dashboard':
        return (
          <div className="h-full overflow-y-auto bg-gray-50">
            <div className="p-6">
              <CostDashboard />
              {/* Add some bottom spacing for better scrolling */}
              <div className="h-8"></div>
            </div>
          </div>
        );
      case 'debug':
        return (
          <div className="h-full overflow-y-auto bg-gray-50">
            <div className="p-6">
              <MonacoTest />
              {/* Add some bottom spacing for better scrolling */}
              <div className="h-8"></div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
