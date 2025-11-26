import React, { useState, useEffect, useCallback } from 'react'
import Taro, { useDidShow } from '@tarojs/taro'
import { View as ViewC, Text as TextC, ScrollView as ScrollViewC, Input as InputC, Button as ButtonC } from '@tarojs/components'
import { getRecords, getBudgetConfig, saveBudgetConfig, clearData } from '../../utils/storage'
import './index.css'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981', '#3b82f6', '#f59e0b'];

// Workaround for Taro type definition issues where components are inferred as Vue components
const View = ViewC as any;
const Text = TextC as any;
const ScrollView = ScrollViewC as any;
const Input = InputC as any;
const Button = ButtonC as any;

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [budgetConfig, setBudgetConfig] = useState({ totalBudget: 0, categoryBudgets: {} });
  const [totalSpent, setTotalSpent] = useState(0);
  const [budgetProgress, setBudgetProgress] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [tempTotalBudget, setTempTotalBudget] = useState(0);

  const tabs = [
    {id: 'all', label: '全部'},
    {id: 'mood', label: '心情'},
    {id: 'expense', label: '消费'},
    {id: 'event', label: '记事'}
  ];

  useDidShow(() => {
    refreshData();
  });

  const refreshData = () => {
    const rawRecords = getRecords().sort((a: any, b: any) => b.timestamp - a.timestamp);
    const rawBudget = getBudgetConfig();
    
    // Process records
    const processed = rawRecords.map((r: any) => {
      const d = new Date(r.timestamp);
      let displayTags: string[] = [];
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

    setRecords(processed);
    setBudgetConfig(rawBudget);
    setTempTotalBudget(rawBudget.totalBudget);

    calculateStats(processed, rawBudget);
    applyFilters(processed, activeTab, filterCategory);
  };

  const calculateStats = (currentRecords: any[], config: any) => {
    const now = new Date();
    const expenseRecords = currentRecords.filter(r => r.type === 'EXPENSE');
    const currentMonthExpenses = expenseRecords.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const spent = currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const progress = config.totalBudget > 0 ? (spent / config.totalBudget) * 100 : 0;

    setTotalSpent(spent);
    setBudgetProgress(Number(progress.toFixed(0)));

    // Chart Data
    const map: Record<string, number> = {};
    currentMonthExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });

    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

    const chart = sorted.map(([name, value], index) => ({
      name,
      value,
      percent: (value / maxVal) * 100,
      color: COLORS[index % COLORS.length]
    }));

    setChartData(chart);
  };

  const applyFilters = (currentRecords: any[], tab: string, cat: string) => {
    let result = currentRecords;

    if (tab === 'mood') result = result.filter(r => r.type === 'MOOD');
    if (tab === 'expense') result = result.filter(r => r.type === 'EXPENSE');
    if (tab === 'event') result = result.filter(r => r.type === 'EVENT');

    // Extract categories
    const cats = new Set<string>();
    result.forEach(r => {
      if (r.type === 'EXPENSE') cats.add(r.category);
      if (r.type === 'EVENT') cats.add(r.category);
      if (r.type === 'MOOD') r.tags.forEach(t => cats.add(t));
    });

    if (cat !== 'all') {
      result = result.filter(r => {
        if (r.type === 'EXPENSE') return r.category === cat;
        if (r.type === 'EVENT') return r.category === cat;
        if (r.type === 'MOOD') return r.tags.includes(cat);
        return false;
      });
    }

    setFilteredRecords(result);
    setCategories(Array.from(cats));
  };

  const switchTab = (id: string) => {
    setActiveTab(id);
    setFilterCategory('all');
    applyFilters(records, id, 'all');
  };

  const selectCategory = (cat: string) => {
    setFilterCategory(cat);
    applyFilters(records, activeTab, cat);
  };

  const toggleBudgetModal = () => setShowBudgetModal(!showBudgetModal);

  const saveBudget = () => {
    const newConfig = { ...budgetConfig, totalBudget: tempTotalBudget };
    saveBudgetConfig(newConfig);
    setBudgetConfig(newConfig);
    setShowBudgetModal(false);
    calculateStats(records, newConfig);
  };

  const clearAllData = () => {
    Taro.showModal({
      title: '确认清空',
      content: '确定要删除所有记录吗？不可恢复。',
      success: (res) => {
        if (res.confirm) {
          clearData();
          refreshData();
          Taro.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  };

  return (
    <View className="container">
      <View className="header glass-nav">
        <Text className="header-title">STATISTICS</Text>
      </View>

      <ScrollView className="content-scroll" scrollY>
        <View className="padding-wrap">
          
          {/* Budget Card */}
          <View className="card budget-card fade-in stagger-1">
            <View className="card-decor"></View>
            <View className="card-content">
              <View className="budget-header">
                <View>
                  <Text className="label">本月预算</Text>
                  <View className="amount-row">
                    <Text className="curr-amount">¥{totalSpent}</Text>
                    <Text className="total-amount">/ {budgetConfig.totalBudget}</Text>
                  </View>
                </View>
                <View className="settings-btn" onClick={toggleBudgetModal}>
                  <Text>⚙️</Text>
                </View>
              </View>
              
              <View className="progress-container">
                <View 
                  className={`progress-bar ${budgetProgress > 100 ? 'bg-red' : (budgetProgress > 80 ? 'bg-orange' : 'bg-indigo')}`}
                  style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                ></View>
              </View>
              
              <View className="budget-footer">
                <Text className="text-indigo">已使用 {budgetProgress}%</Text>
                <Text className="text-gray">{budgetProgress > 100 ? '已超支' : `剩余 ¥${budgetConfig.totalBudget - totalSpent}`}</Text>
              </View>
            </View>
          </View>

          {/* Chart Section */}
          {chartData.length > 0 && (
            <View className="card chart-card fade-in stagger-2">
              <Text className="section-title">消费分布</Text>
              <View className="chart-list">
                {chartData.map((item) => (
                  <View key={item.name} className="chart-item">
                    <Text className="chart-label">{item.name}</Text>
                    <View className="chart-bar-bg">
                      <View className="chart-bar-fill" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></View>
                    </View>
                    <Text className="chart-value">¥{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tabs */}
          <View className="sticky-tabs fade-in stagger-2">
            <ScrollView scrollX className="tabs-scroll" enableFlex>
              {tabs.map((tab) => (
                <View 
                  key={tab.id}
                  className={`tab-item ${activeTab === tab.id ? 'tab-active' : 'tab-normal'}`} 
                  onClick={() => switchTab(tab.id)}
                >
                  {tab.label}
                </View>
              ))}
            </ScrollView>

            {/* Category Filter */}
            {activeTab !== 'all' && categories.length > 0 && (
              <ScrollView scrollX className="sub-tabs-scroll" enableFlex>
                <View 
                  className={`sub-tab ${filterCategory === 'all' ? 'sub-active' : ''}`} 
                  onClick={() => selectCategory('all')}
                >全部</View>
                {categories.map((cat) => (
                  <View 
                    key={cat}
                    className={`sub-tab ${filterCategory === cat ? 'sub-active' : ''}`} 
                    onClick={() => selectCategory(cat)}
                  >
                    {cat}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Record List */}
          <View className="record-list">
            {filteredRecords.length === 0 ? (
              <View className="empty-state fade-in stagger-3">
                <View className="empty-icon"></View>
                <Text>暂无记录</Text>
              </View>
            ) : (
              filteredRecords.map((item) => (
                <View key={item.id} className="record-item fade-in stagger-3">
                  {/* Date Box */}
                  <View className="date-box">
                    <Text className="date-month">{item.month}月</Text>
                    <Text className="date-day">{item.day}</Text>
                  </View>

                  {/* Content */}
                  <View className="record-content">
                    <View className="record-top">
                      <View className="record-title-row">
                        {item.type === 'MOOD' && (
                          <>
                            <Text className="emoji">{item.emoji}</Text>
                            <Text className="title">{item.mood}</Text>
                          </>
                        )}
                        {item.type === 'EXPENSE' && <Text className="title">{item.item}</Text>}
                        {item.type === 'EVENT' && <Text className="title">{item.title}</Text>}
                      </View>
                      
                      {item.type === 'EXPENSE' && <Text className="amount-badge">-¥{item.amount}</Text>}
                    </View>

                    <Text className="time-text">{item.time}</Text>
                    
                    {item.type === 'MOOD' && <Text className="desc-text">{item.description}</Text>}
                    {item.type === 'EVENT' && <Text className="desc-text">{item.details}</Text>}

                    {/* Tags */}
                    <View className="tags-row">
                      {item.displayTags.map((tag, idx) => (
                         <Text key={idx} className={`tag ${item.type === 'MOOD' ? 'tag-yellow' : (item.type === 'EXPENSE' ? 'tag-indigo' : 'tag-blue')}`}>#{tag}</Text>
                      ))}
                    </View>
                  </View>
                </View>
              ))
            )}
            
            {records.length > 0 && (
              <View className="clear-btn-wrapper fade-in stagger-4">
                <Button className="clear-btn" onClick={clearAllData}>🗑 清空所有数据</Button>
              </View>
            )}
          </View>

        </View>
      </ScrollView>

      {/* Budget Modal */}
      {showBudgetModal && (
        <View className="modal-overlay">
          <View className="modal-content fade-in-up">
            <View className="modal-header">
              <Text className="modal-title">预算设置 (每月)</Text>
              <View className="close-btn" onClick={toggleBudgetModal}>×</View>
            </View>
            
            <View className="modal-body">
              <View className="form-group">
                <Text className="label">月总预算</Text>
                <View className="input-wrapper">
                  <Text className="prefix">¥</Text>
                  <Input 
                    className="modal-input" 
                    type="number" 
                    value={String(tempTotalBudget)} 
                    onInput={(e) => setTempTotalBudget(Number(e.detail.value))} 
                  />
                </View>
              </View>
              <Text className="hint-text">目前仅支持设置总预算，分类预算功能敬请期待。</Text>
            </View>

            <View className="modal-footer">
              <Button className="save-btn" onClick={saveBudget}>保存设置</Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default Dashboard