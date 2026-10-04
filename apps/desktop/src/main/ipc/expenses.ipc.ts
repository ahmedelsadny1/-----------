import { ipcMain } from 'electron';
import { ExpenseRepository } from '../database/repositories/expense.repository.js';

export function registerExpensesIpc(expenseRepo: ExpenseRepository): void {
  ipcMain.handle('expenses:list', async (_event, sessionId?: string) => {
    try {
      const data = expenseRepo.list(sessionId);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('expenses:categories', async () => {
    try {
      const data = expenseRepo.listCategories();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('expenses:create', async (_event, params: any) => {
    try {
      const data = expenseRepo.create(params);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
