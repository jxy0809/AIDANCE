
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Mic, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { Message, AppRecord, ButlerResponse, RecordType, BudgetConfig } from '../types';
import { sendMessageToButler } from '../services/geminiService';
import { saveRecord, saveMessages, getMessages, getBudgetConfig, getRecords } from '../services/storageService';

interface ChatViewProps {
  onNewRecord: (record: AppRecord) => void;
}

// Helper to generate IDs without external dependency
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Helper to compress image
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to JPEG 70%
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const ChatView: React.FC<ChatViewProps> = ({ onNewRecord }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const loaded = getMessages();
    if (loaded.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'model',
        content: "您好！我是您的智能管家艾登斯。今天过得怎么样？",
        timestamp: Date.now()
      }]);
    } else {
      setMessages(loaded);
    }

    // Setup Speech Recognition if available
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      try {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'zh-CN';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev + transcript);
          setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech error", event);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } catch (e) {
        console.error("Speech recognition init failed", e);
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        try {
          const base64 = await compressImage(e.target.files[i]);
          newImages.push(base64);
        } catch (err) {
          console.error("Image process error", err);
        }
      }
      setPendingImages(prev => [...prev, ...newImages]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (recognitionRef.current) {
        setIsListening(true);
        recognitionRef.current.start();
      } else {
        alert("您的浏览器不支持语音识别功能。");
      }
    }
  };

  const checkBudget = (expense: {amount: number, category: string}) => {
    const config = getBudgetConfig();
    if (config.totalBudget === 0) return null; // No budget set

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const allRecords = getRecords();
    const monthlyExpenses = allRecords.filter(r => {
      const d = new Date(r.timestamp);
      return r.type === RecordType.EXPENSE && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }) as any[];

    // Include the current new expense
    const totalSpent = monthlyExpenses.reduce((acc, curr) => acc + curr.amount, 0) + expense.amount;
    
    const categorySpent = monthlyExpenses
      .filter(r => r.category === expense.category)
      .reduce((acc, curr) => acc + curr.amount, 0) + expense.amount;

    let alertMsg = null;

    // Category Check
    const catBudget = config.categoryBudgets[expense.category];
    if (catBudget > 0) {
      if (categorySpent > catBudget) {
        alertMsg = `⚠️ 您的【${expense.category}】消费已超支！(预算: ¥${catBudget}, 已用: ¥${categorySpent})`;
      } else if (categorySpent >= catBudget * 0.8) {
        alertMsg = `⚠️ 您的【${expense.category}】消费接近预算。(已用: ${(categorySpent/catBudget*100).toFixed(0)}%)`;
      }
    }

    // Total Check (only if category check didn't trigger strict warning, or append)
    if (totalSpent > config.totalBudget) {
      const msg = `⚠️ 本月总预算已超支！(预算: ¥${config.totalBudget}, 已用: ¥${totalSpent})`;
      alertMsg = alertMsg ? `${alertMsg}\n${msg}` : msg;
    } else if (totalSpent >= config.totalBudget * 0.8) {
      const msg = `⚠️ 本月总预算已使用 ${(totalSpent/config.totalBudget*100).toFixed(0)}%。`;
      alertMsg = alertMsg ? `${alertMsg}\n${msg}` : msg;
    }

    return alertMsg;
  };

  const handleSend = async () => {
    if (!input.trim() && pendingImages.length === 0) return;

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      images: [...pendingImages],
      timestamp: Date.now()
    };

    const currentPendingImages = [...pendingImages];
    setPendingImages([]);
    setInput('');
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setIsTyping(true);

    const apiHistory = updatedMessages.map(m => {
      const parts: any[] = [];
      if (m.content) parts.push({ text: m.content });
      if (m.images) {
        m.images.forEach(img => {
          const clean = img.split(',')[1] || img;
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: clean }});
        });
      }
      return { role: m.role, parts };
    });

    try {
      const response: ButlerResponse = await sendMessageToButler(apiHistory, userMsg.content, currentPendingImages);

      const butlerMsg: Message = {
        id: generateId(),
        role: 'model',
        content: response.reply,
        timestamp: Date.now()
      };

      const finalMessages = [...updatedMessages, butlerMsg];

      // Process Data
      if (response.detectedType !== 'NONE') {
        const base = {
          id: generateId(),
          timestamp: Date.now(),
          rawInput: userMsg.content,
          images: userMsg.images
        };

        let newRecord: AppRecord | null = null;
        let budgetAlert: string | null = null;

        if (response.detectedType === 'MOOD' && response.moodData) {
          newRecord = { ...base, type: RecordType.MOOD, ...response.moodData };
        } else if (response.detectedType === 'EXPENSE' && response.expenseData) {
          newRecord = { ...base, type: RecordType.EXPENSE, currency: '¥', ...response.expenseData };
          // Check Budget immediately
          budgetAlert = checkBudget(response.expenseData);
        } else if (response.detectedType === 'EVENT' && response.eventData) {
          newRecord = { ...base, type: RecordType.EVENT, ...response.eventData };
        }

        if (newRecord) {
          saveRecord(newRecord);
          onNewRecord(newRecord);
        }

        if (budgetAlert) {
            finalMessages.push({
                id: generateId(),
                role: 'model',
                content: budgetAlert,
                timestamp: Date.now() + 100,
                isAlert: true
            });
        }
      }

      setMessages(finalMessages);
      saveMessages(finalMessages);

    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent sending if using IME (Input Method Editor) for languages like Chinese
    if ((e.nativeEvent as any).isComposing) return;
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-modern-bg pb-24 relative">
      {/* Header */}
      <div className="h-14 flex items-center justify-center sticky top-0 z-10 glass-nav border-b border-white/20">
        <h1 className="font-bold text-lg text-slate-700 tracking-wide">AIDANCE</h1>
      </div>

      {/* Messages Area - Added pb-32 to clear the input box */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
              
              {!isUser && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 shrink-0 shadow-sm border border-gray-100 ${msg.isAlert ? 'bg-red-50 text-red-500' : 'bg-white text-modern-primary'}`}>
                  {msg.isAlert ? <AlertCircle size={18}/> : <Bot size={18} />}
                </div>
              )}

              <div className="flex flex-col max-w-[80%]">
                 <div
                  className={`p-4 shadow-soft text-[15px] leading-relaxed relative
                    ${isUser 
                      ? 'bg-gradient-to-br from-modern-primary to-modern-accent text-white rounded-2xl rounded-tr-none' 
                      : msg.isAlert 
                        ? 'bg-red-50 text-red-600 border border-red-100 rounded-2xl' 
                        : 'bg-white text-slate-700 rounded-2xl rounded-tl-none'
                    }`}
                >
                  {/* Images in message */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {msg.images.map((img, idx) => (
                        <img key={idx} src={img} alt="upload" className="max-w-full rounded-xl max-h-48 object-cover shadow-sm" />
                      ))}
                    </div>
                  )}
                  {/* Text content */}
                  {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                </div>
                {/* Timestamp */}
                <div className={`text-[10px] text-gray-400 mt-1 ${isUser ? 'text-right pr-1' : 'text-left pl-1'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>

            </div>
          );
        })}
        
        {isTyping && (
          <div className="flex justify-start">
             <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-3 shadow-sm border border-gray-100">
                <Bot size={18} className="text-modern-primary" />
              </div>
            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-soft">
              <div className="flex space-x-1.5 h-full items-center">
                <div className="w-2 h-2 bg-modern-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-modern-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-modern-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-[90px] left-0 right-0 px-4 z-20">
        <div className="bg-white/90 backdrop-blur-md p-2 rounded-[24px] shadow-soft border border-white/50">
            {/* Pending Images Preview */}
            {pendingImages.length > 0 && (
                <div className="flex gap-2 mb-2 px-2 overflow-x-auto">
                    {pendingImages.map((img, i) => (
                        <div key={i} className="relative w-14 h-14 shrink-0">
                            <img src={img} className="w-full h-full object-cover rounded-xl border border-gray-100" />
                            <button 
                                onClick={() => removePendingImage(i)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md transform scale-75"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="flex items-end gap-2">
                {/* Voice Button */}
                <button
                    onClick={toggleListening}
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 shrink-0
                    ${isListening ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                    <Mic size={20} />
                </button>

                <div className="flex-1 bg-transparent flex items-center py-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isListening ? "正在聆听..." : "输入消息..."}
                        className="w-full bg-transparent border-none outline-none resize-none max-h-24 text-[16px] leading-6 text-slate-800 placeholder-slate-400 font-medium"
                        rows={1}
                        style={{ height: 'auto', minHeight: '24px' }}
                    />
                </div>

                {/* Image Upload Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 hover:bg-slate-200 transition-colors"
                >
                    <ImageIcon size={20} />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    multiple 
                    onChange={handleImageSelect}
                />

                <button
                    onClick={handleSend}
                    disabled={(!input.trim() && pendingImages.length === 0) || isTyping}
                    className={`h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 transform shrink-0
                    ${(input.trim() || pendingImages.length > 0) && !isTyping
                    ? 'bg-modern-primary text-white shadow-lg rotate-0' 
                    : 'bg-slate-100 text-slate-300'}`}
                >
                   <Send size={18} className={input.trim() || pendingImages.length > 0 ? 'ml-0.5' : ''}/>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
