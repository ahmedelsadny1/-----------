import { ipcMain } from 'electron';
import { CashSessionRepository } from '../database/repositories/cash-session.repository.js';

export function registerCashSessionsIpc(cashRepo: CashSessionRepository): void {
  ipcMain.handle('cash-sessions:get-current', async (_event, terminalId = '01H0000000000000000000TERM') => {
    try {
      const session = cashRepo.getActiveSession(terminalId);
      return { success: true, data: session };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cash-sessions:open', async (_event, params: any) => {
    try {
      const session = cashRepo.openSession(params);
      return { success: true, data: session };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cash-sessions:close', async (_event, sessionId: string, countedCash: number, notes?: string) => {
    try {
      const session = cashRepo.closeSession(sessionId, countedCash, notes);
      return { success: true, data: session };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('cash-sessions:add-movement', async (_event, params: any) => {
    try {
      cashRepo.addCashMovement(params);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
