
export enum RecordType {
  MOOD = 'MOOD',
  EXPENSE = 'EXPENSE',
  EVENT = 'EVENT',
  CHAT = 'CHAT'
}

export interface BaseRecord {
  id: string;
  timestamp: number;
  type: RecordType;
  rawInput: string;
  images?: string[]; // Base64 strings
}

export interface MoodRecord extends BaseRecord {
  type: RecordType.MOOD;
  mood: string;
  score: number;
  emoji: string;
  description: string;
  tags: string[]; // Custom tags like "开心", "平静"
}

export interface ExpenseRecord extends BaseRecord {
  type: RecordType.EXPENSE;
  amount: number;
  currency: string;
  category: string; // "餐饮", "交通", etc.
  item: string;
}

export interface EventRecord extends BaseRecord {
  type: RecordType.EVENT;
  title: string;
  details: string;
  category: string; // "工作", "娱乐", etc.
  time?: string;
}

export type AppRecord = MoodRecord | ExpenseRecord | EventRecord;

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  images?: string[];
  timestamp: number;
  isProcessing?: boolean;
  isAlert?: boolean; // For budget alerts
}

export interface BudgetConfig {
  totalBudget: number;
  categoryBudgets: Record<string, number>;
}

// API Response Schema Type
export interface ButlerResponse {
  reply: string;
  detectedType: 'MOOD' | 'EXPENSE' | 'EVENT' | 'NONE';
  moodData?: {
    mood: string;
    score: number;
    emoji: string;
    description: string;
    tags: string[];
  };
  expenseData?: {
    amount: number;
    category: string;
    item: string;
  };
  eventData?: {
    title: string;
    details: string;
    category: string;
    time: string;
  };
}