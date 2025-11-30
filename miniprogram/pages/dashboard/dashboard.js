// pages/dashboard/dashboard.js
const { storageService, RecordType } = require('../../utils/storage.js')

Page({
  data: {
    records: [],
    activeTab: 'all',
    filterCategory: 'all',
    budgetConfig: { totalBudget: 0, categoryBudgets: {} },
    showBudgetModalFlag: false,
    tempBudget: { totalBudget: 0, categoryBudgets: {} },
    commonCategories: ['餐饮', '交通', '购物', '娱乐', '居家', '其他'],
    
    // 计算属性
    moodRecords: [],
    expenseRecords: [],
    eventRecords: [],
    currentMonthExpenses: [],
    totalSpentMonth: 0,
    budgetProgress: 0,
    expenseByCategory: [],
    maxExpenseValue: 0,
    allCategories: [],
    filteredRecords: [],
    
    // 颜色配置
    colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6', '#f59e0b']
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    // 获取所有记录
    const records = storageService.getRecords()
    this.setData({ records })
    
    // 获取预算配置
    const budgetConfig = storageService.getBudgetConfig()
    this.setData({ 
      budgetConfig,
      tempBudget: JSON.parse(JSON.stringify(budgetConfig)) // 深拷贝
    })
    
    // 触发计算
    this.calculateData()
  },

  calculateData() {
    const { records, budgetConfig, activeTab } = this.data
    
    // 分类记录
    const moodRecords = records.filter(r => r.type === RecordType.MOOD)
    const expenseRecords = records.filter(r => r.type === RecordType.EXPENSE)
    const eventRecords = records.filter(r => r.type === RecordType.EVENT)
    
    // 当月消费
    const now = new Date()
    const currentMonthExpenses = expenseRecords.filter(r => {
      const d = new Date(r.timestamp)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    
    // 总消费
    const totalSpentMonth = currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0)
    
    // 预算进度
    const budgetProgress = budgetConfig.totalBudget > 0 ? (totalSpentMonth / budgetConfig.totalBudget) * 100 : 0
    
    // 消费分类统计
    const categoryMap = {}
    currentMonthExpenses.forEach(e => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount
    })
    
    const expenseByCategory = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
    
    const maxExpenseValue = expenseByCategory.length > 0 ? 
      Math.max(...expenseByCategory.map(item => item.value)) : 0
    
    // 所有分类
    const cats = new Set()
    if (activeTab === 'expense') {
      expenseRecords.forEach(r => cats.add(r.category))
    } else if (activeTab === 'event') {
      eventRecords.forEach(r => cats.add(r.category))
    } else if (activeTab === 'mood') {
      moodRecords.forEach(r => r.tags.forEach(t => cats.add(t)))
    }
    const allCategories = Array.from(cats)
    
    // 筛选记录
    let base = records
    if (activeTab === 'mood') base = moodRecords
    if (activeTab === 'expense') base = expenseRecords
    if (activeTab === 'event') base = eventRecords
    
    let filteredRecords = base
    if (this.data.filterCategory !== 'all') {
      filteredRecords = base.filter(r => {
        if (r.type === RecordType.EXPENSE) return r.category === this.data.filterCategory
        if (r.type === RecordType.EVENT) return r.category === this.data.filterCategory
        if (r.type === RecordType.MOOD) return r.tags.includes(this.data.filterCategory)
        return false
      })
    }
    
    filteredRecords = [...filteredRecords].sort((a, b) => b.timestamp - a.timestamp)
    
    // 更新数据
    this.setData({
      moodRecords,
      expenseRecords,
      eventRecords,
      currentMonthExpenses,
      totalSpentMonth,
      budgetProgress,
      expenseByCategory,
      maxExpenseValue,
      allCategories,
      filteredRecords
    })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeTab: tab,
      filterCategory: 'all'
    })
    this.calculateData()
  },

  filterByCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ filterCategory: category })
    this.calculateData()
  },

  showBudgetModal() {
    this.setData({ 
      showBudgetModalFlag: true,
      tempBudget: JSON.parse(JSON.stringify(this.data.budgetConfig))
    })
  },

  hideBudgetModal() {
    this.setData({ showBudgetModalFlag: false })
  },

  onBudgetInput(e) {
    const value = e.detail.value
    this.setData({
      'tempBudget.totalBudget': Number(value)
    })
  },

  onCategoryBudgetInput(e) {
    const category = e.currentTarget.dataset.category
    const value = e.detail.value
    const tempBudget = this.data.tempBudget
    tempBudget.categoryBudgets[category] = Number(value) || 0
    this.setData({ tempBudget })
  },

  saveBudgetConfig() {
    storageService.saveBudgetConfig(this.data.tempBudget)
    this.setData({ 
      budgetConfig: this.data.tempBudget,
      showBudgetModalFlag: false
    })
    this.calculateData()
    wx.showToast({ title: '保存成功', icon: 'success' })
  },

  clearData() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有数据吗？此操作无法撤销。',
      success: (res) => {
        if (res.confirm) {
          storageService.clearData()
          this.setData({
            records: [],
            moodRecords: [],
            expenseRecords: [],
            eventRecords: [],
            currentMonthExpenses: [],
            totalSpentMonth: 0,
            budgetProgress: 0,
            expenseByCategory: [],
            maxExpenseValue: 0,
            allCategories: [],
            filteredRecords: []
          })
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  // 工具函数
  getMonth(timestamp) {
    return new Date(timestamp).getMonth() + 1
  },

  getDay(timestamp) {
    return new Date(timestamp).getDate()
  },

  formatTime(timestamp) {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  },

  getTags(record) {
    if (record.type === RecordType.MOOD) {
      return record.tags || []
    }
    return []
  },

  getTagClass(record, tag) {
    if (record.type === RecordType.MOOD) {
      return 'mood-tag'
    }
    return ''
  }
})