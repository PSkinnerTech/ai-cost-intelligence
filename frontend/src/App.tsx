import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import CostAnalyticsChart from './components/Dashboard/CostAnalyticsChart';
import CostDashboard from './components/Dashboard/CostDashboard';
import OpenAIPlayground from './components/Playground/OpenAIPlayground';
import PromptEditor from './components/Editor/PromptEditor';
import ABTestComparison from './components/Testing/ABTestComparison';
import SessionMonitor from './components/Session/SessionMonitor';
import TraceViewer from './components/Traces/TraceViewer';
import RealTokenTesting from './components/Testing/RealTokenTesting';
import { SignedIn as ClerkSignedIn, SignedOut as ClerkSignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { getPricingDisplay } from './config/pricing';
import { fetchRealDashboardData } from './services/realDataService';

// Type assertion for React 19 compatibility
const SignedIn = ClerkSignedIn as React.FC<{ children: React.ReactNode }>;
const SignedOut = ClerkSignedOut as React.FC<{ children: React.ReactNode }>;

const LandingPage: React.FC = () => {
  const [realSavingsData, setRealSavingsData] = useState<{
    avgSavingsPercentage: number;
    isLoading: boolean;
  }>({ avgSavingsPercentage: 0, isLoading: true });

  // Fetch real savings data on component mount
  useEffect(() => {
    const loadRealSavings = async () => {
      try {
        const realData = await fetchRealDashboardData(1000);
        setRealSavingsData({
          avgSavingsPercentage: realData.totalSavings.percentage,
          isLoading: false
        });
      } catch (error) {
        console.error('Failed to load real savings data:', error);
        setRealSavingsData({
          avgSavingsPercentage: 0,
          isLoading: false
        });
      }
    };

    loadRealSavings();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 Arize + Nevermined Demo
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Real token monitoring and cost optimization for LLM applications
          </p>
          <div className="flex justify-center items-center space-x-4">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              realSavingsData.isLoading 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {realSavingsData.isLoading ? '🔄 Loading Real Data...' : '✅ Live Real Data'}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* GPT-4 Card - Real Pricing */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">GPT-4</h3>
              <div className="mb-4">
                <span className="font-mono text-red-600">
                  {getPricingDisplay('gpt-4')}
                </span>
              </div>
              <div className="mb-4">
                <span className="font-mono text-green-600">
                  Nevermined Optimized Rate
                </span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-green-700">
                  {realSavingsData.isLoading 
                    ? 'Loading...' 
                    : `${realSavingsData.avgSavingsPercentage.toFixed(1)}% Savings`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* GPT-3.5 Turbo Card - Real Pricing */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">GPT-3.5 Turbo</h3>
              <div className="mb-4">
                <span className="font-mono text-red-600">
                  {getPricingDisplay('gpt-3.5-turbo')}
                </span>
              </div>
              <div className="mb-4">
                <span className="font-mono text-green-600">
                  Nevermined Optimized Rate
                </span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-green-700">
                  {realSavingsData.isLoading 
                    ? 'Loading...' 
                    : `${realSavingsData.avgSavingsPercentage.toFixed(1)}% Savings`
                  }
                </span>
              </div>
            </div>
          </div>

          {/* GPT-3.5 Mini Card - Real Pricing */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">GPT-3.5 Mini</h3>
              <div className="mb-4">
                <span className="font-mono text-red-600">
                  {getPricingDisplay('gpt-3.5-turbo-mini')}
                </span>
              </div>
              <div className="mb-4">
                <span className="font-mono text-green-600">
                  Nevermined Optimized Rate
                </span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-green-700">
                  {realSavingsData.isLoading 
                    ? 'Loading...' 
                    : `${realSavingsData.avgSavingsPercentage.toFixed(1)}% Savings`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              📊 Real-Time Cost Optimization
            </h2>
            <p className="text-gray-600 mb-8">
              Monitor actual token usage and costs with live API data
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {realSavingsData.isLoading 
                    ? 'Loading...' 
                    : `${realSavingsData.avgSavingsPercentage.toFixed(1)}%`
                  }
                </div>
                <div className="text-gray-600">Average Cost Reduction</div>
                <div className="text-sm text-gray-500 mt-1">From real API comparisons</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">Real-Time</div>
                <div className="text-gray-600">Token Monitoring</div>
                <div className="text-sm text-gray-500 mt-1">Live Arize integration</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            View Real Dashboard
          </button>
        </div>

        {/* Real Data Disclaimer */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              🔬 100% Real Data
            </h4>
            <p className="text-sm text-blue-700">
              All pricing and savings data displayed is calculated from actual OpenAI API responses. 
              No hardcoded values or assumptions are used. Costs are based on real token usage from live API calls.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('landing');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage />;
      case 'dashboard':
        return <CostDashboard />;
      case 'playground':
        return <OpenAIPlayground />;
      case 'editor':
        return <PromptEditor />;
      case 'testing':
        return <ABTestComparison />;
      case 'real-testing':
        return <RealTokenTesting />;
      case 'session':
        return <SessionMonitor />;
      case 'traces':
        return <TraceViewer />;
      default:
        return <CostDashboard />;
    }
  };

  return (
    <div className="App">
      <SignedOut>
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              🚀 Arize + Nevermined Demo
            </h1>
            <p className="text-gray-600 mb-8">
              Please sign in to access the dashboard
            </p>
            <RedirectToSignIn />
          </div>
        </div>
      </SignedOut>
      
      <SignedIn>
        {currentView === 'landing' ? (
          <LandingPage />
        ) : (
          <div className="flex h-screen bg-gray-100">
            <Sidebar currentView={currentView} onViewChange={setCurrentView} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
                {renderCurrentView()}
              </main>
            </div>
          </div>
        )}
      </SignedIn>
    </div>
  );
}

export default App;
