import React from 'react';

type ViewType = 'editor' | 'comparison' | 'dashboard' | 'debug' | 'analytics';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    {
      id: 'dashboard' as ViewType,
      label: 'Dashboard',
      icon: '🏠',
      description: 'Overview and cost metrics'
    },
    {
      id: 'analytics' as ViewType,
      label: 'Analytics',
      icon: '📊',
      description: 'Advanced charts & insights'
    },
    {
      id: 'editor' as ViewType,
      label: 'Prompt Editor',
      icon: '📝',
      description: 'Create and edit prompts'
    },
    {
      id: 'comparison' as ViewType,
      label: 'A/B Testing',
      icon: '⚖️',
      description: 'Compare prompt variants'
    },
    {
      id: 'debug' as ViewType,
      label: 'Debug Test',
      icon: '🔧',
      description: 'Monaco & API testing'
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                  currentView === item.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Status Indicator */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Backend API</span>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Phoenix Server</span>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Arize Tracing</span>
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 