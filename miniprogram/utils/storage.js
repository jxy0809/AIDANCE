const STORAGE_KEYS = {
  RECORDS: 'butler_app_records',
  MESSAGES: 'butler_app_messages',
  BUDGET: 'butler_app_budget',
};

const getRecords = () => {
  return wx.getStorageSync(STORAGE_KEYS.RECORDS) || [];
};

const saveRecord = (record) => {
  const existing = getRecords();
  const updated = [record, ...existing];
  try {
    wx.setStorageSync(STORAGE_KEYS.RECORDS, updated);
  } catch (e) {
    wx.showToast({ title: '存储空间不足', icon: 'none' });
  }
};

const getMessages = () => {
  return wx.getStorageSync(STORAGE_KEYS.MESSAGES) || [];
};

const saveMessages = (messages) => {
  const savedMessages = messages.slice(-50);
  wx.setStorageSync(STORAGE_KEYS.MESSAGES, savedMessages);
};

const getBudgetConfig = () => {
  return wx.getStorageSync(STORAGE_KEYS.BUDGET) || { totalBudget: 0, categoryBudgets: {} };
};

const saveBudgetConfig = (config) => {
  wx.setStorageSync(STORAGE_KEYS.BUDGET, config);
};

const clearData = () => {
  wx.removeStorageSync(STORAGE_KEYS.RECORDS);
  wx.removeStorageSync(STORAGE_KEYS.MESSAGES);
  wx.removeStorageSync(STORAGE_KEYS.BUDGET);
};

module.exports = {
  getRecords,
  saveRecord,
  getMessages,
  saveMessages,
  getBudgetConfig,
  saveBudgetConfig,
  clearData
};
