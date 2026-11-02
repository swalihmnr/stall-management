import { db } from '../db';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
}

type SyncListener = (state: SyncState) => void;

class SyncService {
  private listeners: Set<SyncListener> = new Set();
  private state: SyncState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateState({ isOnline: true, lastError: null });
        this.syncNow();
      });

      window.addEventListener('offline', () => {
        this.updateState({ isOnline: false });
      });

      // Periodic check every 60 seconds if online
      setInterval(() => {
        if (this.state.isOnline && !this.state.isSyncing) {
          this.refreshPendingCount().then(count => {
            if (count > 0) this.syncNow();
          });
        }
      }, 60000);
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private updateState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach(fn => fn(this.state));
  }

  public async refreshPendingCount(): Promise<number> {
    try {
      const queueCount = await db.syncQueue.count();
      const unsyncedSales = await db.sales.filter(s => !s.synced).count();
      const unsyncedExpenses = await db.expenses.filter(e => !e.synced).count();
      const unsyncedStock = await db.stock.filter(st => !st.synced).count();
      const totalPending = queueCount + unsyncedSales + unsyncedExpenses + unsyncedStock;
      
      this.updateState({ pendingCount: totalPending });
      return totalPending;
    } catch {
      return 0;
    }
  }

  public async queueChange(
    entityType: 'sale' | 'expense' | 'stock',
    action: 'upsert' | 'delete',
    recordId: string,
    payload?: any
  ) {
    try {
      await db.syncQueue.put({
        id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entityType,
        action,
        recordId,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
      });
      await this.refreshPendingCount();

      // Attempt immediate sync if online
      if (this.state.isOnline) {
        this.syncNow();
      }
    } catch (e) {
      console.warn('Could not queue sync change:', e);
    }
  }

  public async syncNow(): Promise<boolean> {
    if (this.state.isSyncing) return false;
    if (!navigator.onLine) {
      this.updateState({ isOnline: false });
      return false;
    }

    this.updateState({ isSyncing: true, lastError: null });

    try {
      // Gather all unsynced local records
      const unsyncedSales = await db.sales.filter(s => !s.synced).toArray();
      const unsyncedExpenses = await db.expenses.filter(e => !e.synced).toArray();
      const unsyncedStock = await db.stock.filter(s => !s.synced).toArray();
      const queueItems = await db.syncQueue.toArray();

      if (unsyncedSales.length === 0 && unsyncedExpenses.length === 0 && unsyncedStock.length === 0 && queueItems.length === 0) {
        this.updateState({ isSyncing: false, pendingCount: 0 });
        return true;
      }

      // Send to backend
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': import.meta.env.VITE_API_SECRET || '',
        },
        body: JSON.stringify({
          sales: unsyncedSales,
          expenses: unsyncedExpenses,
          stock: unsyncedStock,
          queue: queueItems,
          clientTime: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Sync server responded with ${res.status}`);
      }

      // Mark records as synced in IndexedDB
      await db.transaction('rw', db.sales, db.expenses, db.stock, db.syncQueue, db.settings, async () => {
        for (const s of unsyncedSales) {
          await db.sales.update(s.id, { synced: true });
        }
        for (const e of unsyncedExpenses) {
          await db.expenses.update(e.id, { synced: true });
        }
        for (const st of unsyncedStock) {
          await db.stock.update(st.id, { synced: true });
        }
        await db.syncQueue.clear();

        const nowIso = new Date().toISOString();
        // Read existing settings to avoid overwriting user's email/preferences
        const existingSettings = await db.settings.get('app_settings');
        await db.settings.put({
          backupEmail: '',
          backupEmailEnabled: true,
          ...existingSettings,
          id: 'app_settings',
          lastSyncTime: nowIso,
        });
      });

      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.updateState({
        isSyncing: false,
        pendingCount: 0,
        lastSyncTime: nowStr,
        lastError: null,
      });
      return true;
    } catch (err: any) {
      console.warn('Sync failed (will retry when connection/backend is available):', err);
      // Backend is optional: offline records are 100% safe in IndexedDB
      this.updateState({
        isSyncing: false,
        lastError: err?.message || 'Sync failed. Local data safe.',
      });
      await this.refreshPendingCount();
      return false;
    }
  }
}

export const syncService = new SyncService();
