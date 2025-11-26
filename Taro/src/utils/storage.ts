import Taro from '@tarojs/taro'

const STORAGE_KEYS = {
  RECORDS: 'butler_app_records',
  MESSAGES: 'butler_app_messages',
  BUDGET: 'butler_app_budget',
};

export const getRecords = () => {
  return Taro.getStorageSync(STORAGE_KEYS.RECORDS) || [];
};

export const saveRecord = (record: any) => {
  const existing = getRecords();
  const updated = [record, ...existing];
  try {
    Taro.setStorageSync(STORAGE_KEYS.RECORDS, updated);
  } catch (e) {
    Taro.showToast({ title: '存储空间不足', icon: 'none' });
  }
};

export const getMessages = () => {
  return Taro.getStorageSync(STORAGE_KEYS.MESSAGES) || [];
};

export const saveMessages = (messages: any[]) => {
  const savedMessages = messages.slice(-50);
  Taro.setStorageSync(STORAGE_KEYS.MESSAGES, savedMessages);
};

export const getBudgetConfig = () => {
  return Taro.getStorageSync(STORAGE_KEYS.BUDGET) || { totalBudget: 0, categoryBudgets: {} };
};

export const saveBudgetConfig = (config: any) => {
  Taro.setStorageSync(STORAGE_KEYS.BUDGET, config);
};

export const clearData = () => {
  Taro.removeStorageSync(STORAGE_KEYS.RECORDS);
  Taro.removeStorageSync(STORAGE_KEYS.MESSAGES);
  Taro.removeStorageSync(STORAGE_KEYS.BUDGET);
};
