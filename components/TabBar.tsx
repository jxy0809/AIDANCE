import React from 'react';
import { MessageSquare, PieChart } from 'lucide-react';

interface TabBarProps {
  activeTab: 'chat' | 'dashboard';
  onTabChange: (tab: 'chat' | 'dashboard') => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div className="glass-nav px-2 py-2 rounded-full shadow-glow pointer-events-auto border border-white/50 flex gap-1 transform transition-transform">
        <button
          onClick={() => onTabChange('chat')}
          className={`flex items-center justify-center px-6 py-3 rounded-full transition-all duration-300 active:scale-95 ${
            activeTab === 'chat' 
              ? 'bg-modern-primary text-white shadow-md' 
              : 'text-modern-secondary hover:bg-slate-100'
          }`}
        >
          <MessageSquare
            size={20}
            className={activeTab === 'chat' ? 'fill-current' : ''}
            strokeWidth={2}
          />
          {activeTab === 'chat' && <span className="ml-2 text-sm font-semibold animate-pop-in">对话</span>}
        </button>

        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex items-center justify-center px-6 py-3 rounded-full transition-all duration-300 active:scale-95 ${
            activeTab === 'dashboard' 
              ? 'bg-modern-primary text-white shadow-md' 
              : 'text-modern-secondary hover:bg-slate-100'
          }`}
        >
          <PieChart
            size={20}
            className={activeTab === 'dashboard' ? 'fill-current' : ''}
            strokeWidth={2}
          />
          {activeTab === 'dashboard' && <span className="ml-2 text-sm font-semibold animate-pop-in">统计</span>}
        </button>
      </div>
    </div>
  );
};