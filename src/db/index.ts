import Dexie, { Table } from 'dexie';
import type { Sale, Expense, StockEntry, SyncQueueItem, AppSettings } from '../types';

export class ChickenStallDatabase extends Dexie {
  sales!: Table<Sale, string>;
  expenses!: Table<Expense, string>;
  stock!: Table<StockEntry, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('ChickenStallDB');
    this.version(1).stores({
      sales: 'id, date, createdAt, synced',
      expenses: 'id, date, createdAt, synced',
      stock: 'id, date, createdAt, synced',
      syncQueue: 'id, entityType, action, recordId, timestamp, retryCount',
      settings: 'id'
    });
  }
}

export const db = new ChickenStallDatabase();

const LS_KEYS = {
  SALES: 'chickenshop_sales',
  EXPENSES: 'chickenshop_expenses',
  STOCK: 'chickenshop_stock',
  MIGRATED: 'chickenshop_migrated_to_idb_v1',
  BACKUP: 'chickenshop_ls_backup_v1',
};

/**
 * Safe one-time migration from LocalStorage to IndexedDB (Dexie).
 * Preserves original data in localStorage for safety and recovery.
 */
export async function migrateFromLocalStorageIfNeeded(): Promise<{
  migrated: boolean;
  salesCount: number;
  expensesCount: number;
  stockCount: number;
}> {
  try {
    const alreadyMigrated = localStorage.getItem(LS_KEYS.MIGRATED);
    if (alreadyMigrated === 'true') {
      return { migrated: false, salesCount: 0, expensesCount: 0, stockCount: 0 };
    }

    const rawSales = localStorage.getItem(LS_KEYS.SALES);
    const rawExpenses = localStorage.getItem(LS_KEYS.EXPENSES);
    const rawStock = localStorage.getItem(LS_KEYS.STOCK);

    const sales: Sale[] = rawSales ? JSON.parse(rawSales) : [];
    const expenses: Expense[] = rawExpenses ? JSON.parse(rawExpenses) : [];
    const stock: StockEntry[] = rawStock ? JSON.parse(rawStock) : [];

    // Save a safety snapshot backup in localStorage before inserting into Dexie
    localStorage.setItem(
      LS_KEYS.BACKUP,
      JSON.stringify({ sales, expenses, stock, backedUpAt: new Date().toISOString() })
    );

    await db.transaction('rw', db.sales, db.expenses, db.stock, async () => {
      if (Array.isArray(sales) && sales.length > 0) {
        await db.sales.bulkPut(sales.map(s => ({ ...s, synced: s.synced ?? false })));
      }
      if (Array.isArray(expenses) && expenses.length > 0) {
        await db.expenses.bulkPut(expenses.map(e => ({ ...e, synced: e.synced ?? false })));
      }
      if (Array.isArray(stock) && stock.length > 0) {
        await db.stock.bulkPut(stock.map(st => ({ ...st, synced: st.synced ?? false })));
      }
    });

    // Mark migration successful
    localStorage.setItem(LS_KEYS.MIGRATED, 'true');

    return {
      migrated: true,
      salesCount: sales.length,
      expensesCount: expenses.length,
      stockCount: stock.length,
    };
  } catch (error) {
    console.error('Safe LocalStorage to IndexedDB migration failed:', error);
    return { migrated: false, salesCount: 0, expensesCount: 0, stockCount: 0 };
  }
}
