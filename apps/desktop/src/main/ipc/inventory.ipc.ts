import { ipcMain } from 'electron';
import { InventoryRepository } from '../database/repositories/inventory.repository.js';

export function registerInventoryIpc(inventoryRepo: InventoryRepository): void {
  ipcMain.handle('inventory:list', async (_event, limit = 100) => {
    try {
      const items = inventoryRepo.list(limit);
      return { success: true, data: items };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('inventory:get-stock', async (_event, productId: string) => {
    try {
      const stock = inventoryRepo.getStock(productId);
      return { success: true, data: stock };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('inventory:adjust', async (_event, params: any) => {
    try {
      inventoryRepo.adjustStock(params);
      return { success: true, message: 'Stock adjusted successfully' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
