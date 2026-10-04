import { ipcMain } from 'electron';
import { CustomerRepository } from '../database/repositories/customer.repository.js';

export function registerCustomersIpc(customerRepo: CustomerRepository): void {
  ipcMain.handle('customers:search', async (_event, query: string) => {
    try {
      const customers = customerRepo.search(query || '');
      return { success: true, data: customers };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('customers:get-by-id', async (_event, id: string) => {
    try {
      const customer = customerRepo.getById(id);
      return { success: true, data: customer };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('customers:create', async (_event, customer: any) => {
    try {
      const created = customerRepo.create(customer);
      return { success: true, data: created };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
