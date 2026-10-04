import { ipcMain } from 'electron';
import { ProductRepository } from '../database/repositories/product.repository.js';

export function registerProductsIpc(productRepo: ProductRepository): void {
  ipcMain.handle('products:search', async (_event, query: string) => {
    try {
      return productRepo.search(query || '');
    } catch (err: any) {
      console.error('[ProductsIPC] Search failed:', err);
      return [];
    }
  });

  ipcMain.handle('products:get-by-barcode', async (_event, barcode: string) => {
    try {
      return productRepo.getByBarcode(barcode);
    } catch (err: any) {
      console.error('[ProductsIPC] Barcode lookup failed:', err);
      return null;
    }
  });

  ipcMain.handle('products:get-by-id', async (_event, id: string) => {
    try {
      return productRepo.getById(id);
    } catch (err: any) {
      console.error('[ProductsIPC] Product getById failed:', err);
      return null;
    }
  });

  ipcMain.handle('products:list-categories', async () => {
    try {
      return productRepo.listCategories();
    } catch (err: any) {
      console.error('[ProductsIPC] List categories failed:', err);
      return [];
    }
  });
}
