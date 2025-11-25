import React, { useState, useEffect } from 'react';
import { ChatView } from './components/ChatView';
import { DashboardView } from './components/DashboardView';
import { TabBar } from './components/TabBar';
import { getRecords, clearData } from './services/storageService';
import { AppRecord } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard'>('chat');
  const [records, setRecords] = useState<AppRecord[]>([]);

  // Load records on mount
  useEffect(() => {
    setRecords(getRecords());
  }, []);

  const handleNewRecord = (record: AppRecord) => {
    setRecords(prev => [record, ...prev]);
  };

  const handleClearData = () => {
    clearData();
    setRecords([]);
    window.location.reload();
  };

  return (
    <div className="w-full h-screen bg-[#f8fafc] text-gray-800 font-sans flex flex-col overflow-hidden">
      <div className="flex-1 relative overflow-hidden perspective-1000">
        
        {/* Chat View Container */}
        <div 
          className={`absolute inset-0 w-full h-full bg-modern-bg transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] transform will-change-transform ${
            activeTab === 'chat' 
              ? 'opacity-100 translate-x-0 scale-100 z-10' 
              : 'opacity-0 -translate-x-[20%] scale-95 z-0 pointer-events-none'
          }`}
        >
          <ChatView onNewRecord={handleNewRecord} />
        </div>
        
        {/* Dashboard View Container */}
        <div 
          className={`absolute inset-0 w-full h-full bg-modern-bg transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] transform will-change-transform ${
            activeTab === 'dashboard' 
              ? 'opacity-100 translate-x-0 scale-100 z-10' 
              : 'opacity-0 translate-x-[20%] scale-95 z-0 pointer-events-none'
          }`}
        >
          <DashboardView records={records} onClearData={handleClearData} />
        </div>

      </div>
      
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;