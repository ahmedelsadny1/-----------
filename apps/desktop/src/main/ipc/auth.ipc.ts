import { ipcMain } from 'electron';
import { AuthService } from '../services/auth.service.js';

export function registerAuthIpc(authService: AuthService): void {
  ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
    try {
      return await authService.login(username, password);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Authentication failed',
      };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    await authService.logout();
    return { success: true };
  });

  ipcMain.handle('auth:get-session', async () => {
    return await authService.getSession();
  });
}
