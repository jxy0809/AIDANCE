// 常量定义
const STORAGE_KEYS = {
  RECORDS: 'butler_app_records',
  MESSAGES: 'butler_app_messages',
  BUDGET: 'butler_app_budget'
}

const RecordType = {
  MOOD: 'MOOD',
  EXPENSE: 'EXPENSE',
  EVENT: 'EVENT',
  CHAT: 'CHAT'
}

// 存储服务
const storageService = {
  // 保存记录
  saveRecord(record) {
    const existing = this.getRecords()
    const updated = [record, ...existing]
    try {
      wx.setStorageSync(STORAGE_KEYS.RECORDS, updated)
    } catch (e) {
      console.error('Storage error:', e)
      wx.showToast({ title: '存储失败', icon: 'none' })
    }
  },

  // 获取所有记录
  getRecords() {
    try {
      return wx.getStorageSync(STORAGE_KEYS.RECORDS) || []
    } catch (e) {
      return []
    }
  },

  // 保存消息
  saveMessages(messages) {
    try {
      const savedMessages = messages.slice(-50) // 限制条数
      wx.setStorageSync(STORAGE_KEYS.MESSAGES, savedMessages)
    } catch (e) {
      console.error('Save messages error:', e)
    }
  },

  // 获取消息
  getMessages() {
    try {
      return wx.getStorageSync(STORAGE_KEYS.MESSAGES) || []
    } catch (e) {
      return []
    }
  },

  // 保存预算配置
  saveBudgetConfig(config) {
    wx.setStorageSync(STORAGE_KEYS.BUDGET, config)
  },

  // 获取预算配置
  getBudgetConfig() {
    try {
      const config = wx.getStorageSync(STORAGE_KEYS.BUDGET)
      return config || { totalBudget: 0, categoryBudgets: {} }
    } catch (e) {
      return { totalBudget: 0, categoryBudgets: {} }
    }
  },

  // 清空所有数据
  clearData() {
    wx.removeStorageSync(STORAGE_KEYS.RECORDS)
    wx.removeStorageSync(STORAGE_KEYS.MESSAGES)
    wx.removeStorageSync(STORAGE_KEYS.BUDGET)
  }
}

module.exports = {
  storageService,
  RecordType,
  STORAGE_KEYS
}
