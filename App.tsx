
import React, { useState, useEffect } from 'react';
import { ChatView } from './components/ChatView';
import { DashboardView } from './components/DashboardView';
import { TodoView } from './components/TodoView';
import { TabBar } from './components/TabBar';
import { getRecords, clearData, getTodos, saveTodos, saveRecords } from './services/storageService';
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

  const handleDeleteRecord = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    saveRecords(updated);
  };

  // Called when AI adds a new todo
  const handleNewTodo = (todo: TodoItem) => {
    setTodos(prev => [todo, ...prev]);
    // Note: AI also saves to storage in ChatView logic via addTodo if ChatView calls it, 
    // but ChatView in new code calls handleNewTodo. Let's ensure logic is consistent.
    // In ChatView new logic: it calls addTodo(storage) AND onNewTodo(state).
    // So here we just update state.
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
          <ChatView 
            onNewRecord={handleNewRecord} 
            onNewTodo={handleNewTodo}
            todos={todos}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
          />
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
          <DashboardView 
            records={records} 
            onAddRecord={handleNewRecord}
            onClearData={handleClearData} 
            onDeleteRecord={handleDeleteRecord}
          />
        </div>

      </div>
      
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;
