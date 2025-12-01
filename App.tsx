import React, { useState, useEffect } from 'react';
import { ChatView } from './components/ChatView';
import { DashboardView } from './components/DashboardView';
import { TodoView } from './components/TodoView';
import { TabBar } from './components/TabBar';
import { getRecords, clearData, getTodos, saveTodos } from './services/storageService';
import { AppRecord, TodoItem } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'dashboard' | 'todo'>('chat');
  const [records, setRecords] = useState<AppRecord[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // Load records and todos on mount
  useEffect(() => {
    setRecords(getRecords());
    setTodos(getTodos());
  }, []);

  const handleNewRecord = (record: AppRecord) => {
    setRecords(prev => [record, ...prev]);
  };

  const handleNewTodo = (todo: TodoItem) => {
    setTodos(prev => {
       const updated = [todo, ...prev];
       // We only update state here, persistence is handled in ChatView via addTodo or we can sync it here.
       // Since ChatView calls addTodo directly to storage, we just update local state.
       // However, to be safe and consistent with manual actions, let's sync state -> storage here if needed, 
       // but addTodo already saved it. So just updating state is enough.
       return updated;
    });
  };

  const handleManualAddTodo = (text: string) => {
    const newTodo: TodoItem = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      text,
      completed: false,
      timestamp: Date.now()
    };
    const updated = [newTodo, ...todos];
    setTodos(updated);
    saveTodos(updated);
  };

  const handleToggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    saveTodos(updated);
  };

  const handleDeleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    saveTodos(updated);
  };

  const handleClearData = () => {
    clearData();
    setRecords([]);
    setTodos([]);
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
          <ChatView onNewRecord={handleNewRecord} onNewTodo={handleNewTodo} />
        </div>
        
        {/* Todo View Container */}
        <div 
          className={`absolute inset-0 w-full h-full bg-modern-bg transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] transform will-change-transform ${
            activeTab === 'todo' 
              ? 'opacity-100 translate-x-0 scale-100 z-10' 
              : 'opacity-0 translate-x-[20%] scale-95 z-0 pointer-events-none'
          }`}
        >
          <TodoView 
            todos={todos} 
            onAdd={handleManualAddTodo} 
            onToggle={handleToggleTodo} 
            onDelete={handleDeleteTodo}
          />
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