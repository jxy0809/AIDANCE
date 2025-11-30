const { getRecords, getBudgetConfig, saveBudgetConfig, clearData } = require('../../utils/storage');

// Colors for charts
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6', '#f59e0b'];

Page({
  data: {
    activeTab: 'all',
    tabs: [
      {id: 'all', label: '全部'},
      {id: 'mood', label: '心情'},
      {id: 'expense', label: '消费'},
      {id: 'event', label: '记事'}
    ],
    filterCategory: 'all',
    categories: [],
    records: [],
    filteredRecords: [],
    budgetConfig: { totalBudget: 0, categoryBudgets: {} },
    totalSpent: 0,
    budgetProgress: 0,
    chartData: [],
    showBudgetModal: false,
    tempTotalBudget: 0
  },

  onShow() {
    this.refreshData();
  },

  refreshData() {
    const records = getRecords().sort((a, b) => b.timestamp - a.timestamp);
    const budgetConfig = getBudgetConfig();
    
    // Process records for display
    const processedRecords = records.map(r => {
      const d = new Date(r.timestamp);
      let displayTags = [];
      if (r.type === 'MOOD') displayTags = r.tags;
      if (r.type === 'EXPENSE') displayTags = [r.category];
      if (r.type === 'EVENT') displayTags = [r.category];

      return {
        ...r,
        month: d.getMonth() + 1,
        day: d.getDate(),
        time: d.toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'}),
        displayTags
      };
    });

    this.setData({ 
      records: processedRecords,
      budgetConfig,
      tempTotalBudget: budgetConfig.totalBudget
    });

    this.calculateStats();
    this.applyFilters();
  },

  calculateStats() {
    const { records, budgetConfig } = this.data;
    const now = new Date();
    
    const expenseRecords = records.filter(r => r.type === 'EXPENSE');
    const currentMonthExpenses = expenseRecords.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalSpent = currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const budgetProgress = budgetConfig.totalBudget > 0 ? ((totalSpent / budgetConfig.totalBudget) * 100).toFixed(0) : 0;

    // Chart Data
    const map = {};
    currentMonthExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });

    // Sort and calculate percent
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const maxVal = sorted.length > 0 ? sorted[0][1] : 1;
    
    const chartData = sorted.map(([name, value], index) => ({
      name,
      value,
      percent: (value / maxVal) * 100, // Relative to max for visual bar
      color: COLORS[index % COLORS.length]
    }));

    this.setData({ totalSpent, budgetProgress, chartData });
  },

  applyFilters() {
    const { records, activeTab, filterCategory } = this.data;
    let result = records;

    if (activeTab === 'mood') result = result.filter(r => r.type === 'MOOD');
    if (activeTab === 'expense') result = result.filter(r => r.type === 'EXPENSE');
    if (activeTab === 'event') result = result.filter(r => r.type === 'EVENT');

    // Extract categories for current tab
    const cats = new Set();
    result.forEach(r => {
      if (r.type === 'EXPENSE') cats.add(r.category);
      if (r.type === 'EVENT') cats.add(r.category);
      if (r.type === 'MOOD') r.tags.forEach(t => cats.add(t));
    });

    if (filterCategory !== 'all') {
      result = result.filter(r => {
        if (r.type === 'EXPENSE') return r.category === filterCategory;
        if (r.type === 'EVENT') return r.category === filterCategory;
        if (r.type === 'MOOD') return r.tags.includes(filterCategory);
        return false;
      });
    }

    this.setData({ 
      filteredRecords: result,
      categories: Array.from(cats)
    });
  },

  switchTab(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeTab: id, filterCategory: 'all' }, () => {
      this.applyFilters();
    });
  },

  setCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ filterCategory: cat }, () => {
      this.applyFilters();
    });
  },

  toggleBudgetModal() {
    this.setData({ showBudgetModal: !this.data.showBudgetModal });
  },

  onTotalBudgetChange(e) {
    this.setData({ tempTotalBudget: Number(e.detail.value) });
  },

  saveBudget() {
    const newConfig = { ...this.data.budgetConfig, totalBudget: this.data.tempTotalBudget };
    saveBudgetConfig(newConfig);
    this.setData({ budgetConfig: newConfig, showBudgetModal: false });
    this.calculateStats();
  },

  clearAllData() {
    wx.showModal({
      title: '确认清空',
      content: '确定要删除所有记录吗？不可恢复。',
      success: (res) => {
        if (res.confirm) {
          clearData();
          this.refreshData();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  }
});
