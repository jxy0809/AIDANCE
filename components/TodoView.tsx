import React, { useState } from 'react';
import { TodoItem } from '../types';
import { Check, Trash2, Plus, ListTodo } from 'lucide-react';

interface TodoViewProps {
  todos: TodoItem[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TodoView: React.FC<TodoViewProps> = ({ todos, onAdd, onToggle, onDelete }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim());
      setText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-modern-bg relative overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-center shrink-0 glass-nav border-b border-white/20 z-30 relative">
        <h1 className="font-bold text-lg text-slate-700 tracking-wide">TODO LIST</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32 z-10">
        {/* Input Card */}
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl shadow-soft mb-6 flex gap-3 animate-fade-in-up">
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="添加新待办..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-modern-primary transition-all text-slate-700 font-medium placeholder-slate-400"
            />
            <button
                type="submit"
                disabled={!text.trim()}
                className="bg-modern-primary text-white w-12 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
            >
                <Plus size={24} />
            </button>
        </form>

        {/* List */}
        <div className="space-y-3">
            {todos.length === 0 ? (
                 <div className="flex flex-col items-center justify-center text-slate-400 py-12 opacity-60 animate-fade-in-up stagger-1">
                   <div className="w-20 h-20 bg-slate-100 rounded-full mb-4 flex items-center justify-center shadow-sm">
                      <ListTodo size={32} strokeWidth={1.5} className="text-slate-400" />
                   </div>
                   <p className="font-medium text-slate-500">暂无待办事项</p>
                </div>
            ) : (
                todos.map((todo, index) => (
                    <div
                        key={todo.id}
                        className={`bg-white p-4 rounded-2xl shadow-soft border border-gray-50 flex items-center gap-4 transition-all animate-fade-in-up ${index < 5 ? `stagger-${index+1}` : ''} ${todo.completed ? 'opacity-60 bg-slate-50' : 'hover:scale-[1.01]'}`}
                    >
                        <button
                            onClick={() => onToggle(todo.id)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${todo.completed ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-modern-primary'}`}
                        >
                            {todo.completed && <Check size={14} className="text-white" strokeWidth={3} />}
                        </button>
                        
                        <span className={`flex-1 text-[16px] font-medium leading-relaxed transition-all break-words ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {todo.text}
                        </span>

                        <button
                            onClick={() => onDelete(todo.id)}
                            className="text-slate-300 hover:text-red-500 p-2 transition-colors shrink-0 active:scale-90"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};