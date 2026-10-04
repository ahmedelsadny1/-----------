import { ipcMain } from 'electron';
import { SaleService } from '../services/sale.service.js';
import { RefundService } from '../services/refund.service.js';
import { SaleRepository } from '../database/repositories/sale.repository.js';

export function registerSalesIpc(
  saleService: SaleService,
  saleRepo: SaleRepository,
  refundService: RefundService,
): void {
  ipcMain.handle('sales:create', async (_event, params: any) => {
    try {
      const result = saleService.createSale(params);
      return { success: true, data: result };
    } catch (err: any) {
      console.error('[SalesIPC] Sale creation failed:', err);
      return { success: false, error: err.message || 'Failed to complete sale' };
    }
  });

  ipcMain.handle('sales:refund', async (_event, params: any) => {
    try {
      const result = refundService.processRefund(params);
      return { success: true, data: result };
    } catch (err: any) {
      console.error('[SalesIPC] Refund failed:', err);
      return { success: false, error: err.message || 'Failed to process refund' };
    }
  });

  ipcMain.handle('sales:get-by-id', async (_event, id: string) => {
    try {
      const sale = saleRepo.getById(id);
      return { success: true, data: sale };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sales:list', async (_event, limit = 50) => {
    try {
      const sales = saleRepo.listRecent(limit);
      return { success: true, data: sales };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sales:get-by-invoice', async (_event, invoiceNumber: string) => {
    try {
      const sale = saleRepo.getByInvoiceNumber(invoiceNumber);
      return { success: true, data: sale };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}

