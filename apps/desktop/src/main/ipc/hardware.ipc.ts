import { ipcMain } from 'electron';
import { HardwareService } from '../services/hardware.service.js';

export function registerHardwareIpc(hardwareService: HardwareService): void {
  ipcMain.handle('hardware:print-receipt', async (_event, data: any) => {
    try {
      const res = await hardwareService.printReceipt(data);
      return { success: true, data: res };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('hardware:open-drawer', async () => {
    try {
      const res = await hardwareService.openCashDrawer();
      return { success: true, data: res };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('hardware:test-printer', async () => {
    try {
      const res = await hardwareService.testPrinter();
      return { success: true, data: res };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
