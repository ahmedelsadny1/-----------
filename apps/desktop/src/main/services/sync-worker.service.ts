import { BrowserWindow } from 'electron';
import { SyncRepository } from '../database/repositories/sync.repository.js';
import { getSqlite } from '../database/connection.js';

export class SyncWorkerService {
  private syncRepo: SyncRepository;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
  private backendUrl = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

  constructor(syncRepo: SyncRepository) {
    this.syncRepo = syncRepo;
  }

  start(intervalMs = 30000): void {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => {
      this.sync().catch((err) => {
        // Silently catch background errors (offline)
      });
    }, intervalMs);
    console.log(`[SyncWorker] Background sync scheduled every ${intervalMs / 1000}s`);
  }

  stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  getStatus(): { isSyncing: boolean; lastSyncedAt: string | null; pendingCount: number; failedCount: number } {
    const stats = this.syncRepo.getStats();
    return {
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
    };
  }

  async sync(): Promise<{ success: boolean; pushed: number; pulled: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, pushed: 0, pulled: 0, error: 'Sync already in progress' };
    }

    this.isSyncing = true;
    this.broadcastStatus();

    try {
      // 1. PUSH local changes to cloud
      const pushedCount = await this.pushChanges();

      // 2. PULL updates from cloud
      const pulledCount = await this.pullUpdates();

      this.lastSyncedAt = new Date().toISOString();
      return { success: true, pushed: pushedCount, pulled: pulledCount };
    } catch (err: any) {
      return { success: false, pushed: 0, pulled: 0, error: err.message };
    } finally {
      this.isSyncing = false;
      this.broadcastStatus();
    }
  }

  private async pushChanges(): Promise<number> {
    const pending = this.syncRepo.getPendingQueue(50);
    if (pending.length === 0) return 0;

    const sqlite = getSqlite();
    const device = sqlite.prepare('SELECT company_id, branch_id FROM local_device LIMIT 1').get() as any;
    const branchId = device?.branch_id || '01HQ00000000000000000BRANCH1';

    const response = await fetch(`${this.backendUrl}/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': 'DEV-POS-01',
        'x-branch-id': branchId,
      },
      body: JSON.stringify({ operations: pending }),
    });

    if (!response.ok) {
      throw new Error(`Sync push HTTP error: ${response.statusText}`);
    }

    const result = (await response.json()) as any;
    if (result.success) {
      for (const item of pending) {
        this.syncRepo.markCompleted(item.id);
      }
      return pending.length;
    } else {
      throw new Error(result.error || 'Sync push rejected');
    }
  }

  private async pullUpdates(): Promise<number> {
    const sqlite = getSqlite();
    const device = sqlite.prepare('SELECT company_id, branch_id, last_sync_timestamp FROM local_device LIMIT 1').get() as any;
    const branchId = device?.branch_id || '01HQ00000000000000000BRANCH1';
    const since = device?.last_sync_timestamp || '';

    const url = new URL(`${this.backendUrl}/sync/pull`);
    if (since) url.searchParams.set('since', since);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-branch-id': branchId,
      },
    });

    if (!response.ok) {
      return 0; // Server offline or unreachable
    }

    const res = (await response.json()) as any;
    if (!res.success || !res.data) return 0;

    const data = res.data;
    let count = 0;

    sqlite.transaction(() => {
      // Upsert products
      if (data.products?.length > 0) {
        const prodInsert = sqlite.prepare(`
          INSERT INTO products (
            id, company_id, sku, barcode, name, name_ar, description,
            selling_price, cost_price, is_weighted, is_active, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          ON CONFLICT(id) DO UPDATE SET
            barcode = excluded.barcode,
            name = excluded.name,
            name_ar = excluded.name_ar,
            selling_price = excluded.selling_price,
            cost_price = excluded.cost_price,
            updated_at = excluded.updated_at
        `);

        for (const p of data.products) {
          prodInsert.run(
            p.id,
            p.company_id,
            p.sku,
            p.barcode || null,
            p.name,
            p.name_ar || null,
            p.description || null,
            p.selling_price,
            p.cost_price || 0,
            p.is_weighted ? 1 : 0,
            p.updated_at,
          );
          count++;
        }
      }

      // Update last sync timestamp on device
      if (data.timestamp) {
        sqlite.prepare('UPDATE local_device SET last_sync_timestamp = ?').run(data.timestamp);
      }
    })();

    return count;
  }

  private broadcastStatus(): void {
    const status = this.getStatus();
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('sync:status-changed', status);
      }
    }
  }
}
