
import { AppRecord, Message, BudgetConfig, TodoItem } from '../types';

const STORAGE_KEYS = {
  RECORDS: 'butler_app_records',
  MESSAGES: 'butler_app_messages',
  BUDGET: 'butler_app_budget',
  TODOS: 'butler_app_todos',
};

export const saveRecord = (record: AppRecord): void => {
  const existing = getRecords();
  const updated = [record, ...existing];
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
  } catch (e) {
    console.error("Storage quota exceeded", e);
    alert("存储空间已满，请清理旧数据或减少图片使用。");
  }
};

export const getRecords = (): AppRecord[] => {
  const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
  return raw ? JSON.parse(raw) : [];
};

export const saveMessages = (messages: Message[]): void => {
  try {
    // Limit message history length to prevent quota issues with images
    const savedMessages = messages.slice(-50); 
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(savedMessages));
  } catch (e) {
    console.error("Storage quota exceeded", e);
  }
};

export const getMessages = (): Message[] => {
  const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
  return raw ? JSON.parse(raw) : [];
};

export const saveBudgetConfig = (config: BudgetConfig): void => {
  localStorage.setItem(STORAGE_KEYS.BUDGET, JSON.stringify(config));
};

export const getBudgetConfig = (): BudgetConfig => {
  const raw = localStorage.getItem(STORAGE_KEYS.BUDGET);
  return raw ? JSON.parse(raw) : { totalBudget: 0, categoryBudgets: {} };
};

export const saveTodos = (todos: TodoItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos));
  } catch (e) {
    console.error("Storage quota exceeded", e);
  }
};

export const getTodos = (): TodoItem[] => {
  const raw = localStorage.getItem(STORAGE_KEYS.TODOS);
  return raw ? JSON.parse(raw) : [];
};

export const addTodo = (todo: TodoItem): void => {
  const existing = getTodos();
  const updated = [todo, ...existing];
  saveTodos(updated);
};

export const clearData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.RECORDS);
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  localStorage.removeItem(STORAGE_KEYS.BUDGET);
  localStorage.removeItem(STORAGE_KEYS.TODOS);
};