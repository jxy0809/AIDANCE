
import React, { useMemo, useState, useEffect } from 'react';
import { AppRecord, RecordType, MoodRecord, ExpenseRecord, EventRecord, BudgetConfig } from '../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { DollarSign, Calendar, Trash2, Settings, X, Tag, Inbox, Plus, Smile, NotebookPen } from 'lucide-react';
import { getBudgetConfig, saveBudgetConfig, saveRecord } from '../services/storageService';

interface DashboardViewProps {
  records: AppRecord[];
  onClearData: () => void;
  onDeleteRecord: (id: string) => void;
  onAddRecord: (record: AppRecord) => void;
}

// Modern vibrant palette
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6', '#f59e0b'];

// Categories
const EXPENSE_CATEGORIES = ['餐饮', '交通', '购物', '娱乐', '居家', '医疗', '其他'];
const EVENT_CATEGORIES = ['工作', '学习', '娱乐', '社交', '生活'];
const MOOD_EMOJIS = ['😄', '😊', '😐', '😔', '😡', '😴', '🥳', '🤯'];

export const DashboardView: React.FC<DashboardViewProps> = ({ records, onClearData, onDeleteRecord, onAddRecord }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'mood' | 'expense' | 'event'>('all');
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>({ totalBudget: 0, categoryBudgets: {} });
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    setBudgetConfig(getBudgetConfig());
  }, []);

  // -- Data Processing --
  const moodRecords = useMemo(() => records.filter(r => r.type === RecordType.MOOD) as MoodRecord[], [records]);
  const expenseRecords = useMemo(() => records.filter(r => r.type === RecordType.EXPENSE) as ExpenseRecord[], [records]);
  const eventRecords = useMemo(() => records.filter(r => r.type === RecordType.EVENT) as EventRecord[], [records]);

  // Budget Calcs (Current Month)
  const currentMonthExpenses = useMemo(() => {
    const now = new Date();
    return expenseRecords.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [expenseRecords]);

  const totalSpentMonth = currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const budgetProgress = budgetConfig.totalBudget > 0 ? (totalSpentMonth / budgetConfig.totalBudget) * 100 : 0;

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    currentMonthExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthExpenses]);

  const allCategories = useMemo(() => {
      const cats = new Set<string>();
      if (activeTab === 'expense') expenseRecords.forEach(r => cats.add(r.category));
      if (activeTab === 'event') eventRecords.forEach(r => cats.add(r.category));
      if (activeTab === 'mood') moodRecords.forEach(r => r.tags.forEach(t => cats.add(t)));
      return Array.from(cats);
  }, [activeTab, expenseRecords, eventRecords, moodRecords]);

  // -- Filtering --
  const filteredRecords = useMemo(() => {
    let base = records;
    if (activeTab === 'mood') base = moodRecords;
    if (activeTab === 'expense') base = expenseRecords;
    if (activeTab === 'event') base = eventRecords;
    
    if (filterCategory !== 'all') {
        base = base.filter(r => {
            if (r.type === RecordType.EXPENSE) return (r as ExpenseRecord).category === filterCategory;
            if (r.type === RecordType.EVENT) return (r as EventRecord).category === filterCategory;
            if (r.type === RecordType.MOOD) return (r as MoodRecord).tags.includes(filterCategory);
            return false;
        });
    }
    return [...base].sort((a, b) => b.timestamp - a.timestamp);
  }, [records, activeTab, moodRecords, expenseRecords, eventRecords, filterCategory]);


  // -- Helper Renderers --
  const renderRecordItem = (record: AppRecord, index: number) => {
    const date = new Date(record.timestamp);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    // Calculate delay class
    const delayClass = index < 5 ? `stagger-${index + 1}` : '';

    return (
      <div key={record.id} className={`bg-white p-5 rounded-2xl mb-4 shadow-soft border border-gray-50 flex gap-4 transition-transform hover:scale-[1.01] animate-fade-in-up opacity-0 ${delayClass} group relative`}>
         
         {/* Delete Button (Visible on hover or valid touch) */}
         <button 
            onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('确定删除这条记录吗？')) {
                    onDeleteRecord(record.id);
                }
            }}
            className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
         >
            <X size={16} />
         </button>

         {/* Date Box */}
         <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl w-14 h-14 shrink-0 text-slate-500">
             <span className="text-xs font-bold">{month}月</span>
             <span className="text-xl font-bold text-slate-800">{day}</span>
         </div>
            
         {/* Content */}
         <div className="flex-1 min-w-0 pr-6">
             <div className="flex justify-between items-start">
                 <div className="flex flex-col">
                    {record.type === RecordType.MOOD && (
                        <div className="flex items-center gap-2">
                             <span className="text-2xl">{(record as MoodRecord).emoji}</span>
                             <span className="font-bold text-slate-800 text-lg">{(record as MoodRecord).mood}</span>
                        </div>
                    )}
                    {record.type === RecordType.EXPENSE && <span className="font-bold text-slate-800 text-lg">{(record as ExpenseRecord).item}</span>}
                    {record.type === RecordType.EVENT && <span className="font-bold text-slate-800 text-lg">{(record as EventRecord).title}</span>}
                    
                    <span className="text-xs text-slate-400 mt-1">{time}</span>
                 </div>
                 
                 {record.type === RecordType.EXPENSE && (
                     <span className="font-bold text-lg text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">-¥{(record as ExpenseRecord).amount}</span>
                 )}
             </div>
             
             {/* Description / Details */}
             {record.type === RecordType.MOOD && <p className="text-slate-600 text-sm mt-2 leading-relaxed">{(record as MoodRecord).description}</p>}
             {record.type === RecordType.EVENT && <p className="text-slate-600 text-sm mt-2 leading-relaxed">{(record as EventRecord).details}</p>}

             {/* Images */}
             {record.images && record.images.length > 0 && (
                 <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                     {record.images.map((img, idx) => (
                         <img key={idx} src={img} className="h-20 w-20 object-cover rounded-xl border border-gray-100 shadow-sm" />
                     ))}
                 </div>
             )}

             {/* Tags / Meta */}
             <div className="flex flex-wrap gap-2 mt-3">
                  {record.type === RecordType.MOOD && (record as MoodRecord).tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-1 bg-yellow-50 text-yellow-600 rounded-md font-medium">#{t}</span>
                  ))}
                  {record.type === RecordType.EXPENSE && (
                      <span className="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md font-medium">{(record as ExpenseRecord).category}</span>
                  )}
                  {record.type === RecordType.EVENT && (
                      <span className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded-md font-medium">{(record as EventRecord).category}</span>
                  )}
             </div>
         </div>
      </div>
    );
  };

  // -- Add Record Modal --
  const AddRecordModal = () => {
    const [type, setType] = useState<RecordType>(RecordType.EXPENSE);
    
    // Form States
    const [amount, setAmount] = useState('');
    const [item, setItem] = useState('');
    const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
    
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [eventCat, setEventCat] = useState(EVENT_CATEGORIES[0]);

    const [mood, setMood] = useState('');
    const [description, setDescription] = useState('');
    const [score, setScore] = useState(7);
    const [emoji, setEmoji] = useState(MOOD_EMOJIS[0]);

    const handleSubmit = () => {
        const base = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: Date.now(),
            rawInput: 'Manual Entry',
            images: []
        };

        let newRecord: AppRecord | null = null;

        if (type === RecordType.EXPENSE) {
            if(!amount || !item) return alert('请填写完整信息');
            newRecord = {
                ...base,
                type: RecordType.EXPENSE,
                amount: Number(amount),
                category: category,
                item: item,
                currency: '¥'
            } as ExpenseRecord;
        } else if (type === RecordType.EVENT) {
            if(!title) return alert('请填写标题');
            newRecord = {
                ...base,
                type: RecordType.EVENT,
                title: title,
                category: eventCat,
                details: details || title
            } as EventRecord;
        } else if (type === RecordType.MOOD) {
             if(!mood) return alert('请填写心情');
             newRecord = {
                 ...base,
                 type: RecordType.MOOD,
                 mood: mood,
                 score: score,
                 emoji: emoji,
                 description: description || mood,
                 tags: [mood]
             } as MoodRecord;
        }

        if (newRecord) {
            saveRecord(newRecord);
            onAddRecord(newRecord);
            setShowAddModal(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
                {/* Header with Tabs */}
                <div className="p-4 border-b border-gray-100 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-xl text-slate-800">记一笔</h3>
                        <button onClick={() => setShowAddModal(false)} className="bg-slate-200 p-1.5 rounded-full hover:bg-slate-300 transition-colors">
                            <X size={20} className="text-slate-600"/>
                        </button>
                    </div>
                    <div className="flex bg-slate-200/50 p-1 rounded-xl">
                        {[
                            { id: RecordType.EXPENSE, label: '消费', icon: DollarSign },
                            { id: RecordType.EVENT, label: '记事', icon: NotebookPen },
                            { id: RecordType.MOOD, label: '心情', icon: Smile },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setType(t.id)}
                                className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${
                                    type === t.id ? 'bg-white text-modern-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <t.icon size={16} className="mr-1.5"/> {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    
                    {/* EXPENSE FORM */}
                    {type === RecordType.EXPENSE && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">金额</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-lg">¥</span>
                                    <input 
                                        type="number" 
                                        value={amount} 
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        autoFocus
                                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-modern-primary outline-none font-bold text-2xl text-slate-800"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">名称</label>
                                <input 
                                    type="text" 
                                    value={item} 
                                    onChange={e => setItem(e.target.value)}
                                    placeholder="例如：午餐、打车"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-modern-primary outline-none font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">分类</label>
                                <div className="flex flex-wrap gap-2">
                                    {EXPENSE_CATEGORIES.map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setCategory(c)}
                                            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                                                category === c 
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* EVENT FORM */}
                    {type === RecordType.EVENT && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">标题</label>
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="发生了什么？"
                                    autoFocus
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-modern-primary outline-none font-bold text-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">详情</label>
                                <textarea 
                                    value={details} 
                                    onChange={e => setDetails(e.target.value)}
                                    placeholder="添加更多细节..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-modern-primary outline-none font-medium resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">分类</label>
                                <div className="flex flex-wrap gap-2">
                                    {EVENT_CATEGORIES.map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setEventCat(c)}
                                            className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                                                eventCat === c 
                                                ? 'bg-blue-50 border-blue-200 text-blue-600' 
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* MOOD FORM */}
                    {type === RecordType.MOOD && (
                         <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">心情指数 (1-10)</label>
                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <span className="text-2xl font-bold text-modern-primary w-8 text-center">{score}</span>
                                    <input 
                                        type="range" 
                                        min="1" max="10" 
                                        value={score} 
                                        onChange={e => setScore(Number(e.target.value))}
                                        className="flex-1 accent-modern-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">心情关键词</label>
                                <input 
                                    type="text" 
                                    value={mood} 
                                    onChange={e => setMood(e.target.value)}
                                    placeholder="开心, 郁闷, 平静..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-modern-primary outline-none font-bold text-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">表情</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {MOOD_EMOJIS.map(e => (
                                        <button 
                                            key={e}
                                            onClick={() => setEmoji(e)}
                                            className={`text-2xl w-12 h-12 flex items-center justify-center rounded-xl border transition-all shrink-0 ${
                                                emoji === e 
                                                ? 'bg-yellow-50 border-yellow-200 scale-110 shadow-sm' 
                                                : 'bg-white border-slate-100 hover:bg-slate-50'
                                            }`}
                                        >
                                            {e}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">描述</label>
                                <textarea 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="为什么会有这样的心情？"
                                    rows={2}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-modern-primary outline-none font-medium resize-none"
                                />
                            </div>
                        </>
                    )}

                </div>
                <div className="p-6 border-t border-gray-100 bg-white">
                    <button onClick={handleSubmit} className="w-full bg-modern-primary hover:bg-modern-primaryDark text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">
                        确认添加
                    </button>
                </div>
            </div>
        </div>
    );
  };

  // -- Budget Modal --
  const BudgetModal = () => {
    const [total, setTotal] = useState(budgetConfig.totalBudget);
    const [cats, setCats] = useState(budgetConfig.categoryBudgets);
    
    const handleSave = () => {
        const newConfig = { totalBudget: Number(total), categoryBudgets: cats };
        setBudgetConfig(newConfig);
        saveBudgetConfig(newConfig);
        setShowBudgetModal(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in-up">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-xl text-slate-800">预算设置 (每月)</h3>
                    <button onClick={() => setShowBudgetModal(false)} className="bg-slate-200 p-1.5 rounded-full hover:bg-slate-300 transition-colors">
                        <X size={20} className="text-slate-600"/>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">月总预算</label>
                        <div className="relative">
                            <span className="absolute left-4 top-3 text-slate-400 font-bold">¥</span>
                            <input 
                                type="number" 
                                value={total} 
                                onChange={e => setTotal(Number(e.target.value))}
                                className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-modern-primary focus:border-transparent outline-none transition-all font-semibold text-lg"
                            />
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                             <Tag size={16}/> 分类预算
                        </h4>
                        <div className="grid gap-3">
                            {EXPENSE_CATEGORIES.map(cat => (
                                <div key={cat} className="flex items-center gap-3">
                                    <span className="w-14 text-sm font-medium text-slate-600">{cat}</span>
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs">¥</span>
                                        <input 
                                            type="number" 
                                            placeholder="无限制"
                                            value={cats[cat] || ''} 
                                            onChange={e => setCats({...cats, [cat]: Number(e.target.value)})}
                                            className="w-full pl-7 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-modern-primary outline-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-6 border-t border-gray-100 bg-white">
                    <button onClick={handleSave} className="w-full bg-modern-primary hover:bg-modern-primaryDark text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">保存设置</button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-modern-bg overflow-hidden relative">
      {/* Header - Fixed */}
      <div className="h-14 flex items-center justify-center shrink-0 glass-nav border-b border-white/20 z-30 relative px-4">
        <h1 className="font-bold text-lg text-slate-700 tracking-wide">STATISTICS</h1>
        {/* Add Button */}
        <button 
            onClick={() => setShowAddModal(true)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-modern-primary text-white rounded-full shadow-md hover:bg-modern-primaryDark transition-colors active:scale-90"
        >
            <Plus size={20} />
        </button>
      </div>

      {/* Fixed Budget Section - Now fixed at the top below header */}
      <div className="shrink-0 px-4 pt-4 pb-2 bg-modern-bg z-20">
         <div className="bg-white p-6 rounded-3xl shadow-soft relative overflow-hidden animate-fade-in-up stagger-1 opacity-0">
               {/* Decor */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 z-0"></div>

               <div className="flex justify-between items-start mb-6 relative z-10">
                  <div>
                      <h2 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">本月预算</h2>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-800">¥{totalSpentMonth}</span>
                        <span className="text-slate-400 font-medium">/ {budgetConfig.totalBudget}</span>
                      </div>
                  </div>
                  {/* Settings Button */}
                  <button onClick={() => setShowBudgetModal(true)} className="p-2 text-slate-300 hover:text-slate-500 transition-colors active:scale-90">
                      <Settings size={20}/>
                  </button>
               </div>
               
               <div className="relative z-10">
                   <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className={`h-full rounded-full transition-all duration-1000 ease-out ${budgetProgress > 100 ? 'bg-red-500' : budgetProgress > 80 ? 'bg-orange-400' : 'bg-modern-primary'}`} 
                         style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                       />
                   </div>
                   <div className="flex justify-between mt-2 text-xs font-medium">
                       <span className="text-modern-primary">已使用 {budgetProgress.toFixed(0)}%</span>
                       <span className="text-slate-400">{budgetProgress > 100 ? '已超支' : `剩余 ¥${budgetConfig.totalBudget - totalSpentMonth}`}</span>
                   </div>
               </div>
            </div>
      </div>

      {/* Main Scrollable Area - Contains Charts, Tabs, and List */}
      <div className="flex-1 overflow-y-auto min-h-0 relative z-10">
        <div className="px-4 pb-32">

            {/* Charts Area */}
            {expenseRecords.length > 0 && (
              <div className="bg-white p-5 rounded-3xl shadow-soft animate-fade-in-up stagger-2 opacity-0 flex flex-col mb-6 mt-2">
                 <h2 className="text-slate-800 font-bold mb-2 text-sm ml-2">消费分布</h2>
                 <div className="h-44 w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={expenseByCategory} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={5} interval={0} />
                        <Tooltip cursor={{fill: '#f1f5f9', radius: 8}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                        <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={24}>
                            {expenseByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            )}

            {/* Tabs - Sticky position */}
            {/* Fix: Moved px-4 from Wrapper to Inner container to avoid clipping left side scale effects */}
            <div className="sticky top-0 z-20 bg-modern-bg/95 backdrop-blur-sm py-2 -mx-4 mb-2 transition-all">
                <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-2">
                  {[
                      {id: 'all', label: '全部'},
                      {id: 'mood', label: '心情'},
                      {id: 'expense', label: '消费'},
                      {id: 'event', label: '记事'}
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id as any); setFilterCategory('all'); }}
                      className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap shadow-sm active:scale-95
                        ${activeTab === tab.id 
                          ? 'bg-slate-800 text-white transform scale-105' 
                          : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Sub-Filter (Tags/Categories) */}
                {activeTab !== 'all' && allCategories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2 px-4 py-1">
                        <button 
                            onClick={() => setFilterCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors active:scale-95 ${filterCategory === 'all' ? 'bg-slate-200 border-slate-300 text-slate-800' : 'bg-transparent border-slate-300 text-slate-500'}`}
                        >
                            全部
                        </button>
                        {allCategories.map(cat => (
                            <button 
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition-colors active:scale-95 ${filterCategory === cat ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* List Content */}
            <div className="space-y-4 min-h-[200px]">
              {filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400 py-12 opacity-60 animate-fade-in-up stagger-4">
                   <div className="w-20 h-20 bg-slate-100 rounded-full mb-4 flex items-center justify-center shadow-sm">
                      <Inbox size={32} strokeWidth={1.5} className="text-slate-400" />
                   </div>
                   <p className="font-medium text-slate-500">暂无记录</p>
                </div>
              ) : (
                filteredRecords.map(renderRecordItem)
              )}

              {/* Action Buttons */}
               <div className="mt-8 mb-4 animate-fade-in-up stagger-4 opacity-0">
                  <button 
                    onClick={() => {
                      if(window.confirm('确定要清空所有数据吗？此操作无法撤销。')) {
                        onClearData();
                      }
                    }}
                    className="w-full py-4 text-red-500 text-sm font-bold bg-red-50 hover:bg-red-100 rounded-2xl flex items-center justify-center transition-colors active:scale-95"
                  >
                    <Trash2 size={18} className="mr-2" /> 清空所有数据
                  </button>
               </div>
            </div>
        </div>
      </div>

      {/* Modal Render */}
      {showBudgetModal && <BudgetModal />}
      {showAddModal && <AddRecordModal />}
    </div>
  );
};
