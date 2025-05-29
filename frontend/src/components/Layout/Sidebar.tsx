import React from 'react';

type ViewType = 'landing' | 'dashboard' | 'playground' | 'editor' | 'testing' | 'real-testing' | 'session' | 'traces';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const menuItems = [
  {
    id: 'dashboard' as ViewType,
    name: 'Cost Dashboard',
    icon: '📊',
    description: '100% Real Data'
  },
  {
    id: 'real-testing' as ViewType,
    name: 'Real Testing',
    icon: '🧪',
    description: 'Live API Tests'
  },
  {
    id: 'playground' as ViewType,
    name: 'OpenAI Playground',
    icon: '🎮',
    description: 'Direct API Testing'
  },
  {
    id: 'editor' as ViewType,
    name: 'Prompt Editor',
    icon: '✏️',
    description: 'Prompt Management'
  },
  {
    id: 'testing' as ViewType,
    name: 'A/B Testing',
    icon: '⚡',
    description: 'Comparison Tests'
  },
  {
    id: 'session' as ViewType,
    name: 'Session Monitor',
    icon: '👁️',
    description: 'Real-time Monitoring'
  },
  {
    id: 'traces' as ViewType,
    name: 'Trace Viewer',
    icon: '🔍',
    description: 'Arize Integration'
  }
];

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <span className="text-2xl">🚀</span>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Arize Demo</h2>
            <p className="text-sm text-gray-600">Real Data Dashboard</p>
          </div>
        </div>
        
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                currentView === item.id
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </div>
            </button>
          ))}
        </nav>
        
        {/* Real Data Indicator */}
        <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-800">Live Real Data</span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            All metrics from actual API calls
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 