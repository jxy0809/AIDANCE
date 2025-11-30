const { storageService, RecordType } = require('../../utils/storage')
const { sendMessageToButler } = require('../../utils/gemini')

const app = getApp()

Page({
  data: {
    messages: [],
    input: '',
    isTyping: false,
    scrollToView: '',
    pendingImages: []
  },
  
  onLoad() {
    const history = storageService.getMessages()
    if (history.length === 0) {
      this.setData({
        messages: [{
          id: 'welcome',
          role: 'model',
          content: '您好！我是您的智能管家艾登斯。今天过得怎么样？',
          timestamp: Date.now()
        }]
      })
      this.saveMessages()
    } else {
      this.setData({ messages: history })
    }
    this.scrollToBottom()
  },

  onShow() {
    // 刷新记录列表（从 dashboard 返回时）
    const records = storageService.getRecords()
    if (app.globalData) {
      app.globalData.records = records
    }
  },

  onInput(e) {
    this.setData({ input: e.detail.value })
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 3,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFilePaths
        const promises = tempFiles.map(path => this.compressImage(path))
        
        Promise.all(promises).then(base64Images => {
          this.setData({
            pendingImages: [...this.data.pendingImages, ...base64Images]
          })
        })
      }
    })
  },

  // 压缩图片为 base64
  compressImage(filePath) {
    return new Promise((resolve) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: (res) => {
          resolve(`data:image/jpeg;base64,${res.data}`)
        },
        fail: () => resolve(null)
      })
    })
  },

  // 删除待发送图片
  removePendingImage(e) {
    const index = e.currentTarget.dataset.index
    const images = this.data.pendingImages.filter((_, i) => i !== index)
    this.setData({ pendingImages: images })
  },

  // 发送消息
  async sendMessage() {
    const { input, messages, pendingImages } = this.data
    
    if (!input.trim() && pendingImages.length === 0) {
      return
    }

    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: input.trim(),
      images: [...pendingImages],
      timestamp: Date.now()
    }

    const currentPendingImages = [...pendingImages]
    
    this.setData({
      messages: [...messages, userMsg],
      input: '',
      pendingImages: [],
      isTyping: true
    })
    
    this.scrollToBottom()
    this.saveMessages()

    // 准备 API 历史记录
    const apiHistory = this.data.messages.map(m => {
      const parts = []
      if (m.content) parts.push({ text: m.content })
      if (m.images) {
        m.images.forEach(img => {
          const clean = img.split(',')[1] || img
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: clean } })
        })
      }
      return { role: m.role, parts }
    })

    try {
      const response = await sendMessageToButler(apiHistory, userMsg.content, currentPendingImages)
      
      const butlerMsg = {
        id: 'msg-' + (Date.now() + 1),
        role: 'model',
        content: response.reply,
        timestamp: Date.now()
      }

      let finalMessages = [...this.data.messages, butlerMsg]
      const budgetAlerts = []

      const base = {
        timestamp: Date.now(),
        rawInput: userMsg.content,
        images: userMsg.images
      }

      // 处理心情记录
      if (response.moods && response.moods.length > 0) {
        response.moods.forEach(mood => {
          const newRecord = { 
            ...base, 
            id: 'record-' + Date.now() + Math.random(), 
            type: RecordType.MOOD, 
            ...mood 
          }
          storageService.saveRecord(newRecord)
        })
      }

      // 处理消费记录
      if (response.expenses && response.expenses.length > 0) {
        response.expenses.forEach(exp => {
          const newRecord = { 
            ...base, 
            id: 'record-' + Date.now() + Math.random(), 
            type: RecordType.EXPENSE, 
            currency: '¥', 
            ...exp 
          }
          storageService.saveRecord(newRecord)
          
          // 检查预算
          const alert = this.checkBudget(exp)
          if (alert) budgetAlerts.push(alert)
        })
      }

      // 处理事件记录
      if (response.events && response.events.length > 0) {
        response.events.forEach(evt => {
          const newRecord = { 
            ...base, 
            id: 'record-' + Date.now() + Math.random(), 
            type: RecordType.EVENT, 
            ...evt 
          }
          storageService.saveRecord(newRecord)
        })
      }

      // 添加预算警告
      if (budgetAlerts.length > 0) {
        const uniqueAlerts = Array.from(new Set(budgetAlerts))
        uniqueAlerts.forEach(alert => {
          finalMessages.push({
            id: 'alert-' + Date.now() + Math.random(),
            role: 'model',
            content: alert,
            timestamp: Date.now() + 100,
            isAlert: true
          })
        })
      }

      this.setData({ messages: finalMessages, isTyping: false })
      this.saveMessages()
      this.scrollToBottom()

      // 更新全局记录
      if (app.globalData) {
        app.globalData.records = storageService.getRecords()
      }

    } catch (e) {
      console.error(e)
      this.setData({ isTyping: false })
      wx.showToast({ title: '发送失败', icon: 'none' })
    }
  },

  // 检查预算
  checkBudget(expense) {
    const config = storageService.getBudgetConfig()
    if (config.totalBudget === 0) return null

    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const allRecords = storageService.getRecords()
    const monthlyExpenses = allRecords.filter(r => {
      const d = new Date(r.timestamp)
      return r.type === RecordType.EXPENSE && 
             d.getMonth() === currentMonth && 
             d.getFullYear() === currentYear
    })

    const totalSpent = monthlyExpenses.reduce((acc, curr) => acc + curr.amount, 0) + expense.amount
    const categorySpent = monthlyExpenses
      .filter(r => r.category === expense.category)
      .reduce((acc, curr) => acc + curr.amount, 0) + expense.amount

    let alertMsg = null

    const catBudget = config.categoryBudgets[expense.category]
    if (catBudget > 0) {
      if (categorySpent > catBudget) {
        alertMsg = `⚠️ 您的【${expense.category}】消费已超支！(预算: ¥${catBudget}, 已用: ¥${categorySpent})`
      } else if (categorySpent >= catBudget * 0.8) {
        alertMsg = `⚠️ 您的【${expense.category}】消费接近预算。(已用: ${(categorySpent/catBudget*100).toFixed(0)}%)`
      }
    }

    if (totalSpent > config.totalBudget) {
      const msg = `⚠️ 本月总预算已超支！(预算: ¥${config.totalBudget}, 已用: ¥${totalSpent})`
      alertMsg = alertMsg ? `${alertMsg}\n${msg}` : msg
    } else if (totalSpent >= config.totalBudget * 0.8) {
      const msg = `⚠️ 本月总预算已使用 ${(totalSpent/config.totalBudget*100).toFixed(0)}%。`
      alertMsg = alertMsg ? `${alertMsg}\n${msg}` : msg
    }

    return alertMsg
  },

  saveMessages() {
    storageService.saveMessages(this.data.messages)
  },

  scrollToBottom() {
    setTimeout(() => {
      this.setData({
        scrollToView: 'msg-' + (this.data.messages.length - 1)
      })
    }, 100)
  }
})
