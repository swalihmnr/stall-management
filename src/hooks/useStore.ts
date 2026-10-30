import { useState, useEffect, useCallback } from 'react';
import { db, migrateFromLocalStorageIfNeeded } from '../db';
import { syncService, type SyncState } from '../services/syncService';
import type { Sale, Expense, StockEntry, AppSettings } from '../types';

export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function todayStr(): string {
  return toDateString(new Date());
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useStore() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync state
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
  });

  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    id: 'app_settings',
    shopName: 'Chicken Stall',
    shopLogo: '🐓',
    storageFolderName: '',
    stallDetailsConfigured: false,
    dismissedSetupAdvice: false,
    backupEmail: '',
    backupEmailEnabled: true,
  });

  // ── Load from IndexedDB & Migrate ──────────────────────────────────────────
  const refreshFromDB = useCallback(async () => {
    try {
      const [sList, eList, stList, appSettings] = await Promise.all([
        db.sales.orderBy('createdAt').reverse().toArray(),
        db.expenses.orderBy('createdAt').reverse().toArray(),
        db.stock.orderBy('createdAt').reverse().toArray(),
        db.settings.get('app_settings'),
      ]);

      setSales(sList);
      setExpenses(eList);
      setStock(stList);
      if (appSettings) {
        setSettings(prev => ({ ...prev, ...appSettings }));
      }
      await syncService.refreshPendingCount();
    } catch (err) {
      console.error('Failed to load records from IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    let unsubscribeSync: (() => void) | null = null;

    async function init() {
      await migrateFromLocalStorageIfNeeded();
      await refreshFromDB();
      setIsInitialized(true);

      unsubscribeSync = syncService.subscribe((state) => {
        setSyncState(state);
      });

      if (navigator.onLine) {
        syncService.syncNow().catch(() => {});
      }
    }

    init();

    return () => {
      if (unsubscribeSync) unsubscribeSync();
    };
  }, [refreshFromDB]);

  const today = todayStr();

  // ── Sales ──────────────────────────────────────────────────────────────────
  const addSale = async (sale: Omit<Sale, 'id' | 'date' | 'createdAt'>) => {
    const newSale: Sale = {
      ...sale,
      id: generateId(),
      date: today,
      createdAt: Date.now(),
      synced: false,
    };

    setSales(prev => [newSale, ...prev]);

    try {
      await db.sales.put(newSale);
      await syncService.queueChange('sale', 'upsert', newSale.id, newSale);
    } catch (err) {
      console.error('Failed to save sale to IndexedDB:', err);
    }
  };

  const deleteSale = async (id: string) => {
    setSales(prev => prev.filter(s => s.id !== id));
    try {
      await db.sales.delete(id);
      await syncService.queueChange('sale', 'delete', id);
    } catch (err) {
      console.error('Failed to delete sale from IndexedDB:', err);
    }
  };

  const todaySales = sales.filter(s => s.date === today);
  const totalSalesToday = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);

  // ── Expenses ───────────────────────────────────────────────────────────────
  const addExpense = async (expense: Omit<Expense, 'id' | 'date' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expense,
      id: generateId(),
      date: today,
      createdAt: Date.now(),
      synced: false,
    };

    setExpenses(prev => [newExpense, ...prev]);

    try {
      await db.expenses.put(newExpense);
      await syncService.queueChange('expense', 'upsert', newExpense.id, newExpense);
    } catch (err) {
      console.error('Failed to save expense to IndexedDB:', err);
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      await db.expenses.delete(id);
      await syncService.queueChange('expense', 'delete', id);
    } catch (err) {
      console.error('Failed to delete expense from IndexedDB:', err);
    }
  };

  const todayExpenses = expenses.filter(e => e.date === today);
  const totalExpensesToday = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // ── Stock ──────────────────────────────────────────────────────────────────
  const upsertStock = async (entry: Omit<StockEntry, 'id' | 'createdAt'>) => {
    const existing = stock.find(s => s.date === entry.date);
    const updatedEntry: StockEntry = existing
      ? { ...existing, ...entry, synced: false }
      : { ...entry, id: generateId(), createdAt: Date.now(), synced: false };

    setStock(prev => {
      const idx = prev.findIndex(s => s.date === entry.date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedEntry;
        return next;
      }
      return [updatedEntry, ...prev];
    });

    try {
      await db.stock.put(updatedEntry);
      await syncService.queueChange('stock', 'upsert', updatedEntry.id, updatedEntry);
    } catch (err) {
      console.error('Failed to save stock to IndexedDB:', err);
    }
  };

  const todayStock = stock.find(s => s.date === today);
  const soldToday = todaySales.reduce((sum, s) => sum + s.weight, 0);
  const openingStock = todayStock?.openingStock ?? 0;
  const purchased = todayStock?.purchased ?? 0;
  const openingQty = todayStock?.openingQty ?? 0;
  const purchasedQty = todayStock?.purchasedQty ?? 0;
  const remainingStock = openingStock + purchased - soldToday;
  const todayPricePerKg = todayStock?.pricePerKg ?? 0;

  // Average kg per piece
  const totalKgStock = openingQty + purchasedQty > 0
    ? (openingStock + purchased) / (openingQty + purchasedQty)
    : 0;
  const soldQtyEst = totalKgStock > 0 ? Math.round(soldToday / totalKgStock) : 0;
  const remainingQty = Math.max(0, openingQty + purchasedQty - soldQtyEst);

  // Last 7 days price history
  const priceHistory = stock
    .filter(s => s.pricePerKg > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map(s => ({ date: s.date, price: s.pricePerKg }));

  // Price trend
  const sortedPriced = [...priceHistory].sort((a, b) => b.date.localeCompare(a.date));
  const priceTrend: 'up' | 'down' | 'same' | 'new' =
    sortedPriced.length < 2 ? 'new'
    : sortedPriced[0].price > sortedPriced[1].price ? 'up'
    : sortedPriced[0].price < sortedPriced[1].price ? 'down'
    : 'same';

  // Profit
  const profitToday = totalSalesToday - totalExpensesToday;

  // ── Export / Import / Clear ────────────────────────────────────────────────
  const exportData = () => {
    const data = JSON.stringify(
      {
        version: 2,
        app: 'chicken-stall-pwa',
        exportedAt: new Date().toISOString(),
        sales,
        expenses,
        stock,
        settings,
      },
      null,
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chicken_stall_backup_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File): Promise<{ salesCount: number; expensesCount: number; stockCount: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);

          if (!parsed || (typeof parsed !== 'object')) {
            throw new Error('Invalid backup file format');
          }

          const importedSales: Sale[] = Array.isArray(parsed.sales) ? parsed.sales : [];
          const importedExpenses: Expense[] = Array.isArray(parsed.expenses) ? parsed.expenses : [];
          const importedStock: StockEntry[] = Array.isArray(parsed.stock) ? parsed.stock : [];

          for (const s of importedSales) {
            if (!s.id || typeof s.totalAmount !== 'number') {
              throw new Error('Corrupted sale record in backup file');
            }
          }
          for (const exp of importedExpenses) {
            if (!exp.id || typeof exp.amount !== 'number') {
              throw new Error('Corrupted expense record in backup file');
            }
          }

          await db.transaction('rw', db.sales, db.expenses, db.stock, async () => {
            if (importedSales.length > 0) await db.sales.bulkPut(importedSales);
            if (importedExpenses.length > 0) await db.expenses.bulkPut(importedExpenses);
            if (importedStock.length > 0) await db.stock.bulkPut(importedStock);
          });

          await refreshFromDB();
          resolve({
            salesCount: importedSales.length,
            expensesCount: importedExpenses.length,
            stockCount: importedStock.length,
          });
        } catch (err: any) {
          reject(new Error(err?.message || 'Failed to import backup file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const clearAllData = async () => {
    try {
      await db.transaction('rw', db.sales, db.expenses, db.stock, db.syncQueue, async () => {
        await db.sales.clear();
        await db.expenses.clear();
        await db.stock.clear();
        await db.syncQueue.clear();
      });
      setSales([]);
      setExpenses([]);
      setStock([]);
      await syncService.refreshPendingCount();
    } catch (err) {
      console.error('Failed to clear database:', err);
    }
  };

  // ── Settings & Shop Profile ───────────────────────────────────────────────
  const updateBackupSettings = async (email: string, enabled: boolean) => {
    const updated: AppSettings = {
      ...settings,
      backupEmail: email,
      backupEmailEnabled: enabled,
    };
    setSettings(updated);
    try {
      await db.settings.put(updated);
      if (navigator.onLine) {
        fetch('/api/backup/email-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, enabled }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const updateShopProfile = async (shopName: string, shopLogo: string, storageFolderName?: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stall_details_configured', 'true');
    }
    const updated: AppSettings = {
      ...settings,
      shopName: shopName.trim() || 'Chicken Stall',
      shopLogo: shopLogo || '🐓',
      storageFolderName: storageFolderName !== undefined ? storageFolderName : (settings.storageFolderName || ''),
      stallDetailsConfigured: true,
      dismissedSetupAdvice: true,
    };
    setSettings(updated);
    try {
      await db.settings.put(updated);
    } catch (err) {
      console.error('Failed to save shop profile:', err);
    }
  };

  const setStorageFolder = async (folderName: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stall_details_configured', 'true');
    }
    const updated: AppSettings = {
      ...settings,
      storageFolderName: folderName,
      stallDetailsConfigured: true,
      dismissedSetupAdvice: true,
    };
    setSettings(updated);
    try {
      await db.settings.put(updated);
    } catch (err) {
      console.error('Failed to save storage folder:', err);
    }
  };

  const dismissSetupAdvice = async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stall_details_configured', 'true');
    }
    const updated: AppSettings = {
      ...settings,
      stallDetailsConfigured: true,
      dismissedSetupAdvice: true,
    };
    setSettings(updated);
    try {
      await db.settings.put(updated);
    } catch (err) {
      console.error('Failed to dismiss setup advice:', err);
    }
  };

  const pickStorageFolder = async (): Promise<{ success: boolean; folderName?: string; error?: string }> => {
    try {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
        });
        const name = dirHandle.name || 'Selected Folder';
        await setStorageFolder(name);
        return { success: true, folderName: name };
      } else {
        const fallbackName = 'Device Internal Storage / ChickenStall';
        await setStorageFolder(fallbackName);
        return { success: true, folderName: fallbackName };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, error: 'Folder selection was cancelled.' };
      }
      return { success: false, error: err.message || 'Could not select folder' };
    }
  };

  const triggerSync = () => {
    return syncService.syncNow();
  };

  return {
    // raw
    sales, expenses, stock, isInitialized,
    // today filters
    today, todaySales, todayExpenses, todayStock,
    // today computed kg
    totalSalesToday, totalExpensesToday, profitToday,
    soldToday, openingStock, purchased, remainingStock,
    // today computed qty (pieces)
    openingQty, purchasedQty, soldQtyEst, remainingQty,
    // price
    todayPricePerKg, priceHistory, priceTrend,
    // sync state
    isOnline: syncState.isOnline,
    isSyncing: syncState.isSyncing,
    pendingSyncCount: syncState.pendingCount,
    lastSyncTime: syncState.lastSyncTime,
    syncError: syncState.lastError,
    triggerSync,
    // settings & shop customization
    settings,
    shopName: settings.shopName || 'Chicken Stall',
    shopLogo: settings.shopLogo || '🐓',
    storageFolderName: settings.storageFolderName || '',
    dismissedSetupAdvice: Boolean(settings.dismissedSetupAdvice),
    stallDetailsConfigured: Boolean(settings.stallDetailsConfigured),
    updateBackupSettings,
    updateShopProfile,
    setStorageFolder,
    dismissSetupAdvice,
    pickStorageFolder,
    // actions
    addSale, deleteSale,
    addExpense, deleteExpense,
    upsertStock,
    exportData, importData, clearAllData,
  };
}
