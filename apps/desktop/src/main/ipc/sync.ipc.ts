import { ipcMain } from 'electron';
import { SyncRepository } from '../database/repositories/sync.repository.js';
import { SyncWorkerService } from '../services/sync-worker.service.js';

export function registerSyncIpc(syncRepo: SyncRepository, syncWorker?: SyncWorkerService): void {
  ipcMain.handle('sync:get-status', async () => {
    try {
      if (syncWorker) {
        return { success: true, data: syncWorker.getStatus() };
      }
      const stats = syncRepo.getStats();
      return {
        success: true,
        data: {
          isSyncing: false,
          pendingCount: stats.pendingCount,
          failedCount: stats.failedCount,
          lastSyncedAt: null,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:trigger', async () => {
    try {
      if (syncWorker) {
        const result = await syncWorker.sync();
        return { success: true, data: result };
      }
      const stats = syncRepo.getStats();
      return {
        success: true,
        message: `Sync cycle triggered. ${stats.pendingCount} operations queued.`,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
