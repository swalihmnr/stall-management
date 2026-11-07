export type PaymentMethod = 'cash' | 'upi';

export interface Sale {
  id: string;
  date: string;       // ISO date YYYY-MM-DD
  weight: number;     // kg
  pieces?: number;    // piece count (number of birds/pieces)
  pricePerKg: number; // ₹
  totalAmount: number;
  paymentMethod: PaymentMethod;
  createdAt: number;
  synced?: boolean;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  createdAt: number;
  synced?: boolean;
}

export interface StockEntry {
  id: string;
  date: string;
  openingStock: number;     // kg
  openingQty: number;       // pieces
  purchased: number;        // kg purchased today
  purchasedQty: number;     // pieces purchased today
  pricePerKg: number;       // ₹ — daily selling price (can change anytime)
  createdAt: number;
  synced?: boolean;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'sale' | 'expense' | 'stock';
  action: 'upsert' | 'delete';
  recordId: string;
  payload?: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface AppSettings {
  id: string; // 'app_settings'
  shopName?: string;
  shopLogo?: string;
  storageFolderName?: string;
  stallDetailsConfigured?: boolean;
  dismissedSetupAdvice?: boolean;
  backupEmail: string;
  backupEmailEnabled: boolean;
  lastBackupTime?: string;
  lastBackupStatus?: 'success' | 'failed' | 'idle';
  lastBackupMessage?: string;
  lastSyncTime?: string;
}

export interface BackupHistoryItem {
  id: string;
  timestamp: string;
  status: 'success' | 'failed';
  type: 'manual' | 'scheduled';
  recipient: string;
  recordCount: { sales: number; expenses: number; stock: number };
  message: string;
}

export interface AppData {
  sales: Sale[];
  expenses: Expense[];
  stock: StockEntry[];
  settings?: AppSettings;
  lastUpdated: number;
}

export type Tab = 'dashboard' | 'sales' | 'expenses' | 'stock' | 'reports' | 'data';
