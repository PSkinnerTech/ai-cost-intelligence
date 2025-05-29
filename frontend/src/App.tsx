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
import SimpleSavingsCalculator from './components/SimpleSavingsCalculator';

// Import ViewType from Sidebar
type ViewType = 'landing' | 'dashboard' | 'playground' | 'editor' | 'testing' | 'real-testing' | 'session' | 'traces';

// Type assertion for React 19 compatibility
const SignedIn = ClerkSignedIn as React.FC<{ children: React.ReactNode }>;
const SignedOut = ClerkSignedOut as React.FC<{ children: React.ReactNode }>;

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Arize + Nevermined
          </h1>
          <p className="text-2xl text-gray-600">
            Same monitoring. Real savings.
          </p>
        </div>

        {/* Real Data Savings Calculator */}
        <SimpleSavingsCalculator />

        {/* Simple FAQ with Real Data Focus */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Quick Answers</h2>
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-semibold">Does Arize still work?</h3>
              <p className="text-gray-600">Yes. 100% of traces still flow to Arize.</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-semibold">How much can I save?</h3>
              <p className="text-gray-600">Based on real API tests. Actual savings calculated from live data.</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-semibold">How long to implement?</h3>
              <p className="text-gray-600">5 minutes. Just change your API endpoint.</p>
            </div>
          </div>
        </div>

        {/* Real Data Disclaimer */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              🔬 100% Real Data
            </h4>
            <p className="text-sm text-blue-700">
              All savings calculations are based on actual OpenAI API responses and real token usage. 
              No mock data - everything is calculated from live API calls and official OpenAI pricing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('landing');

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
