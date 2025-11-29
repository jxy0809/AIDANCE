
const { sendMessageToButler } = require('../../utils/gemini');
const { saveRecord, getMessages, saveMessages, getRecords, getBudgetConfig } = require('../../utils/storage');

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

Page({
  data: {
    messages: [],
    input: '',
    isTyping: false,
    pendingImages: [],
    isListening: false,
    scrollIntoView: '',
    keyboardHeight: 0,
    bottomPadding: 120, // Initial padding for input area
    canSend: false
  },

  onLoad() {
    this.loadMessages();
  },

  onShow() {
    // Refresh if needed
  },

  loadMessages() {
    const loaded = getMessages();
    if (loaded.length === 0) {
      const welcome = {
        id: 'welcome',
        role: 'model',
        content: "您好！我是您的智能管家艾登斯。今天过得怎么样？",
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})
      };
      this.setData({ messages: [welcome], scrollIntoView: 'bottom-anchor' });
    } else {
      const formatted = loaded.map(m => ({
        ...m,
        timeStr: new Date(m.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})
      }));
      this.setData({ messages: formatted, scrollIntoView: 'bottom-anchor' });
    }
  },

  handleInput(e) {
    const val = e.detail.value;
    this.setData({ 
      input: val,
      canSend: val.trim().length > 0 || this.data.pendingImages.length > 0
    });
  },

  onFocus(e) {
    const height = e.detail.height;
    this.setData({ 
      keyboardHeight: height,
      bottomPadding: height + 120 
    });
    this.scrollToBottom();
  },

  onBlur() {
    this.setData({ 
      keyboardHeight: 0,
      bottomPadding: 120
    });
  },

  scrollToBottom() {
    this.setData({ scrollIntoView: 'bottom-anchor' });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles;
        // Convert to base64 for API
        tempFiles.forEach(file => {
          wx.getFileSystemManager().readFile({
            filePath: file.tempFilePath,
            encoding: 'base64',
            success: (data) => {
               const base64 = 'data:image/jpeg;base64,' + data.data;
               this.setData({
                 pendingImages: [...this.data.pendingImages, base64],
                 canSend: true
               });
            }
          });
        });
      }
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const newImages = this.data.pendingImages.filter((_, i) => i !== index);
    this.setData({
      pendingImages: newImages,
      canSend: this.data.input.trim().length > 0 || newImages.length > 0
    });
  },

  toggleListening() {
    // Basic mock or implementation of wx.getRecorderManager could go here
    wx.showToast({ title: '长按输入框语音功能 (需开发)', icon: 'none' });
  },

  checkBudget(expense) {
    const config = getBudgetConfig();
    if (config.totalBudget === 0) return null;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const allRecords = getRecords();
    
    const monthlyExpenses = allRecords.filter(r => {
      const d = new Date(r.timestamp);
      return r.type === 'EXPENSE' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalSpent = monthlyExpenses.reduce((acc, curr) => acc + curr.amount, 0) + expense.amount;
    const categorySpent = monthlyExpenses
      .filter(r => r.category === expense.category)
      .reduce((acc, curr) => acc + curr.amount, 0) + expense.amount;

    let alertMsg = null;
    const catBudget = config.categoryBudgets[expense.category];

    if (catBudget > 0 && categorySpent > catBudget) {
       alertMsg = `⚠️ 您的【${expense.category}】消费已超支！`;
    }

    if (totalSpent > config.totalBudget) {
       const msg = `⚠️ 本月总预算已超支！`;
       alertMsg = alertMsg ? `${alertMsg}\n${msg}` : msg;
    }

    return alertMsg;
  },

  async handleSend() {
    if (!this.data.canSend || this.data.isTyping) return;

    const content = this.data.input;
    const images = [...this.data.pendingImages];
    
    const userMsg = {
      id: generateId(),
      role: 'user',
      content: content,
      images: images,
      timestamp: Date.now(),
      timeStr: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})
    };

    const newMessages = [...this.data.messages, userMsg];
    this.setData({
      messages: newMessages,
      input: '',
      pendingImages: [],
      canSend: false,
      isTyping: true,
      scrollIntoView: `msg-${newMessages.length - 1}`
    });

    saveMessages(newMessages);

    // Prepare history for API
    const apiHistory = newMessages.map(m => {
       const parts = [];
       if (m.content) parts.push({text: m.content});
       // Simplify: In real app, we might not send back all image data to save bandwidth, 
       // but here we follow the structure.
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

      // Process Data Arrays
      let budgetAlerts = [];
      const base = {
         id: '', 
         timestamp: Date.now(),
         rawInput: content,
         images: images
      };

      // 1. Moods
      if (response.moods && response.moods.length > 0) {
          response.moods.forEach(mood => {
              const newRecord = { ...base, id: generateId(), type: 'MOOD', ...mood };
              saveRecord(newRecord);
          });
      }

      // 2. Expenses
      if (response.expenses && response.expenses.length > 0) {
          response.expenses.forEach(exp => {
              const newRecord = { ...base, id: generateId(), type: 'EXPENSE', currency: '¥', ...exp };
              saveRecord(newRecord);
              
              const alert = this.checkBudget(exp);
              if (alert) budgetAlerts.push(alert);
          });
      }

      // 3. Events
      if (response.events && response.events.length > 0) {
          response.events.forEach(evt => {
              const newRecord = { ...base, id: generateId(), type: 'EVENT', ...evt };
              saveRecord(newRecord);
          });
      }

      // Add unique budget alerts
      if (budgetAlerts.length > 0) {
          const uniqueAlerts = Array.from(new Set(budgetAlerts));
          uniqueAlerts.forEach(alert => {
            finalMessages.push({
                id: generateId(),
                role: 'model',
                content: alert,
                timestamp: Date.now() + 100,
                isAlert: true,
                timeStr: new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})
            });
          });
      }

      this.setData({ messages: finalMessages, isTyping: false });
      saveMessages(finalMessages);
      this.scrollToBottom();

    } catch (e) {
      console.error(e);
      this.setData({ isTyping: false });
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },
  
  previewImage(e) {
    const current = e.currentTarget.dataset.src;
    wx.previewImage({
      current: current,
      urls: this.data.messages.flatMap(m => m.images || [])
    });
  }
});
