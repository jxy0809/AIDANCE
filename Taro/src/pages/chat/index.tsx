import React, { useState, useEffect } from 'react'
import Taro from '@tarojs/taro'
import { View as ViewC, Text as TextC, Image as ImageC, ScrollView as ScrollViewC, Input as InputC } from '@tarojs/components'
import { sendMessageToButler } from '../../utils/gemini'
import { saveRecord, getMessages, saveMessages, getRecords, getBudgetConfig, saveBudgetConfig } from '../../utils/storage'
import './index.css'

// Workaround for Taro type definition issues where components are inferred as Vue components
const View = ViewC as any;
const Text = TextC as any;
const Image = ImageC as any;
const ScrollView = ScrollViewC as any;
const Input = InputC as any;

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [scrollIntoView, setScrollIntoView] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [bottomPadding, setBottomPadding] = useState(120);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = () => {
    const loaded = getMessages();
    if (loaded.length === 0) {
      const welcome = {
        id: 'welcome',
        role: 'model',
        content: "您好！我是您的智能管家艾登斯。今天过得怎么样？",
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})
      };
      setMessages([welcome]);
      setTimeout(() => setScrollIntoView('bottom-anchor'), 100);
    } else {
      const formatted = loaded.map(m => ({
        ...m,
        timeStr: new Date(m.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})
      }));
      setMessages(formatted);
      setTimeout(() => setScrollIntoView('bottom-anchor'), 100);
    }
  };

  const scrollToBottom = () => {
    setScrollIntoView(`bottom-anchor-${Date.now()}`); // Force update
  };

  const handleFocus = (e) => {
    const height = e.detail.height;
    setKeyboardHeight(height);
    setBottomPadding(height + 120);
    scrollToBottom();
  };

  const handleBlur = () => {
    setKeyboardHeight(0);
    setBottomPadding(120);
  };

  const chooseImage = () => {
    Taro.chooseMedia({
      count: 3,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles;
        tempFiles.forEach(file => {
          Taro.getFileSystemManager().readFile({
            filePath: file.tempFilePath,
            encoding: 'base64',
            success: (data) => {
               const base64 = 'data:image/jpeg;base64,' + data.data;
               setPendingImages(prev => [...prev, base64]);
            }
          });
        });
      }
    });
  };

  const removeImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleListening = () => {
    Taro.showToast({ title: '语音功能开发中', icon: 'none' });
  };

  const checkBudget = (expense: any) => {
    const config = getBudgetConfig();
    if (config.totalBudget === 0) return null;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const allRecords = getRecords();
    
    const monthlyExpenses = allRecords.filter((r: any) => {
      const d = new Date(r.timestamp);
      return r.type === 'EXPENSE' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalSpent = monthlyExpenses.reduce((acc, curr: any) => acc + curr.amount, 0) + expense.amount;
    const categorySpent = monthlyExpenses
      .filter((r: any) => r.category === expense.category)
      .reduce((acc, curr: any) => acc + curr.amount, 0) + expense.amount;

    let alertMsg: string | null = null;
    const catBudget = config.categoryBudgets[expense.category];

    if (catBudget > 0 && categorySpent > catBudget) {
       alertMsg = `⚠️ 您的【${expense.category}】消费已超支！`;
    }

    if (totalSpent > config.totalBudget) {
       const msg = `⚠️ 本月总预算已超支！`;
       alertMsg = alertMsg ? `${alertMsg}\n${msg}` : msg;
    }

    return alertMsg;
  };

  const handleSend = async () => {
    const hasContent = input.trim().length > 0 || pendingImages.length > 0;
    if (!hasContent || isTyping) return;

    const content = input;
    const images = [...pendingImages];
    
    const userMsg = {
      id: generateId(),
      role: 'user',
      content: content,
      images: images,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setPendingImages([]);
    setIsTyping(true);
    saveMessages(newMessages);
    
    setTimeout(() => setScrollIntoView(`msg-${newMessages.length - 1}`), 100);

    const apiHistory = newMessages.map(m => {
       const parts: any[] = [];
       if (m.content) parts.push({text: m.content});
       return { role: m.role, parts };
    });

    try {
      const response = await sendMessageToButler(apiHistory, content, images);
      
      const botMsg = {
        id: generateId(),
        role: 'model',
        content: response.reply,
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})
      };

      const finalMessages = [...newMessages, botMsg];

      if (response.detectedType !== 'NONE') {
         const base = {
           id: generateId(),
           timestamp: Date.now(),
           rawInput: content,
           images: images
         };

         let newRecord: any = null;
         let budgetAlert: string | null = null;

         if (response.detectedType === 'MOOD' && response.moodData) {
           newRecord = { ...base, type: 'MOOD', ...response.moodData };
         } else if (response.detectedType === 'EXPENSE' && response.expenseData) {
           newRecord = { ...base, type: 'EXPENSE', currency: '¥', ...response.expenseData };
           budgetAlert = checkBudget(response.expenseData);
         } else if (response.detectedType === 'EVENT' && response.eventData) {
           newRecord = { ...base, type: 'EVENT', ...response.eventData };
         }

         if (newRecord) {
           saveRecord(newRecord);
         }

         if (budgetAlert) {
           finalMessages.push({
             id: generateId(),
             role: 'model',
             content: budgetAlert,
             timestamp: Date.now() + 100,
             isAlert: true,
             timeStr: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})
           });
         }
      }

      setMessages(finalMessages);
      setIsTyping(false);
      saveMessages(finalMessages);
      setTimeout(() => setScrollIntoView(`bottom-anchor-${Date.now()}`), 100);

    } catch (e) {
      console.error(e);
      setIsTyping(false);
      Taro.showToast({ title: '发送失败', icon: 'none' });
    }
  };

  const previewImage = (current: string) => {
    const urls = messages.flatMap(m => m.images || []);
    Taro.previewImage({
      current: current,
      urls: urls
    });
  };

  const canSend = input.trim().length > 0 || pendingImages.length > 0;

  return (
    <View className="container">
      <View className="header glass-nav">
        <Text className="header-title">AIDANCE</Text>
      </View>

      <ScrollView 
        className="messages-area" 
        scrollY 
        scrollIntoView={scrollIntoView}
        scrollWithAnimation
        enableFlex
        style={{ paddingBottom: `${bottomPadding}px` }}
        onClick={handleBlur}
      >
        {messages.map((item, index) => (
          <View key={item.id}>
             <View className={`message-wrapper ${item.role === 'user' ? 'user-wrapper' : 'model-wrapper'}`} id={`msg-${index}`}>
              
              {item.role !== 'user' && (
                <View className={`avatar ${item.isAlert ? 'avatar-alert' : 'avatar-bot'}`}>
                  {item.isAlert 
                    ? <Text>⚠️</Text> 
                    : <Image src={require('../../assets/chat-active.png')} mode="aspectFit" className="avatar-icon" />
                  }
                </View>
              )}

              <View className={`bubble ${item.role === 'user' ? 'bubble-user' : (item.isAlert ? 'bubble-alert' : 'bubble-model')}`}>
                {item.images && item.images.length > 0 && (
                  <View className="image-grid">
                    {item.images.map((img, idx) => (
                      <Image key={idx} src={img} mode="aspectFill" className="msg-image" onClick={() => previewImage(img)} />
                    ))}
                  </View>
                )}
                <Text userSelect className="message-text">{item.content}</Text>
              </View>
            </View>
            
            <View className={`timestamp ${item.role === 'user' ? 'time-right' : 'time-left'}`}>
              {item.timeStr}
            </View>
          </View>
        ))}

        {isTyping && (
          <View className="message-wrapper model-wrapper">
            <View className="avatar avatar-bot">
              <Image src={require('../../assets/chat-active.png')} mode="aspectFit" className="avatar-icon" />
            </View>
            <View className="bubble bubble-model typing-bubble">
              <View className="dot dot-1"></View>
              <View className="dot dot-2"></View>
              <View className="dot dot-3"></View>
            </View>
          </View>
        )}

        <View id={`bottom-anchor-${Date.now()}`} className="anchor-point" style={{height: '1px'}}></View>
        <View id="bottom-anchor" className="anchor-point" style={{height: '1px'}}></View>
      </ScrollView>

      <View className="input-container glass-nav" style={{ bottom: `${keyboardHeight}px` }}>
        {pendingImages.length > 0 && (
          <ScrollView scrollX className="preview-scroll">
            <View className="preview-list">
              {pendingImages.map((img, index) => (
                <View key={index} className="preview-item">
                  <Image src={img} mode="aspectFill" className="preview-img" />
                  <View className="preview-close" onClick={(e) => { e.stopPropagation(); removeImage(index); }}>×</View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View className="input-bar">
          <View className={`icon-btn ${isListening ? 'btn-listening' : 'btn-normal'}`} onClick={toggleListening}>
            <Text className="iconfont">🎤</Text>
          </View>

          <Input 
            className="text-input" 
            type="text" 
            confirmType="send"
            placeholder={isListening ? '正在聆听...' : '输入消息...'}
            placeholderClass="placeholder-style"
            value={input} 
            onInput={(e) => setInput(e.detail.value)}
            onConfirm={handleSend}
            onFocus={handleFocus}
            onBlur={handleBlur}
            adjustPosition={false}
          />

          <View className="icon-btn btn-normal" onClick={chooseImage}>
            <Text className="iconfont">📷</Text>
          </View>

          <View className={`icon-btn ${canSend ? 'btn-primary' : 'btn-disabled'}`} onClick={handleSend}>
            <Text className="iconfont">➤</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

export default Chat