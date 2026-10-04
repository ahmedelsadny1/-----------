// ============================================
// Electron Main Process — Entry Point
// ============================================

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDatabase, closeDatabase } from './database/connection.js';
import { runMigrations } from './database/migrator.js';
import { seedLocalDatabase } from './database/seed.js';
import { AuthService } from './services/auth.service.js';
import { registerAuthIpc } from './ipc/auth.ipc.js';
import { ProductRepository } from './database/repositories/product.repository.js';
import { registerProductsIpc } from './ipc/products.ipc.js';
import { SaleService } from './services/sale.service.js';
import { RefundService } from './services/refund.service.js';
import { SaleRepository } from './database/repositories/sale.repository.js';
import { registerSalesIpc } from './ipc/sales.ipc.js';
import { CashSessionRepository } from './database/repositories/cash-session.repository.js';
import { registerCashSessionsIpc } from './ipc/cash-sessions.ipc.js';
import { CustomerRepository } from './database/repositories/customer.repository.js';
import { registerCustomersIpc } from './ipc/customers.ipc.js';
import { SyncRepository } from './database/repositories/sync.repository.js';
import { SyncWorkerService } from './services/sync-worker.service.js';
import { registerSyncIpc } from './ipc/sync.ipc.js';
import { InventoryRepository } from './database/repositories/inventory.repository.js';
import { registerInventoryIpc } from './ipc/inventory.ipc.js';
import { ExpenseRepository } from './database/repositories/expense.repository.js';
import { registerExpensesIpc } from './ipc/expenses.ipc.js';
import { HardwareService } from './services/hardware.service.js';
import { registerHardwareIpc } from './ipc/hardware.ipc.js';

// Keep a global reference to prevent garbage collection
let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Supermarket POS',
    show: false, // Show when ready to prevent flash
    webPreferences: {
      // SECURITY: Context isolation is CRITICAL
      contextIsolation: true,
      // SECURITY: No Node.js in renderer
      nodeIntegration: false,
      // SECURITY: Sandbox the renderer
      sandbox: true,
      // Preload script provides the safe IPC bridge
      preload: path.join(__dirname, 'preload.js'),
      // Enforce same-origin policy
      webSecurity: true,
    },
  });

  // Show window when ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the renderer
  if (isDev) {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? // Dev: allow Vite HMR WebSocket and inline styles
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws://localhost:* http://localhost:*; img-src 'self' data: blob:;"
            : // Production: strict CSP
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:;",
        ],
      },
    });
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // Prevent opening new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---- IPC Handlers ----
const authService = new AuthService();
registerAuthIpc(authService);

const productRepo = new ProductRepository();
registerProductsIpc(productRepo);

const saleRepo = new SaleRepository();
const saleService = new SaleService();
const refundService = new RefundService();
registerSalesIpc(saleService, saleRepo, refundService);

const cashRepo = new CashSessionRepository();
registerCashSessionsIpc(cashRepo);

const customerRepo = new CustomerRepository();
registerCustomersIpc(customerRepo);

const syncRepo = new SyncRepository();
const syncWorker = new SyncWorkerService(syncRepo);
registerSyncIpc(syncRepo, syncWorker);
syncWorker.start(30000);

const inventoryRepo = new InventoryRepository();
registerInventoryIpc(inventoryRepo);

const expenseRepo = new ExpenseRepository();
registerExpensesIpc(expenseRepo);

const hardwareService = new HardwareService();
registerHardwareIpc(hardwareService);

ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:get-platform', () => {
  return process.platform;
});

// ---- App Lifecycle ----

app.whenReady().then(() => {
  try {
    const { sqlite } = initDatabase({
      dbPath: path.join(app.getPath('userData'), 'supermarket_pos.db'),
    });
    runMigrations(sqlite);
    seedLocalDatabase(sqlite);
    console.log('[Database] SQLite initialized, migrations applied, and local seed verified.');
  } catch (err) {
    console.error('[Database] Failed to initialize SQLite database:', err);
  }

  createWindow();

  app.on('activate', () => {
    // macOS: re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  // On macOS, keep app running until explicit quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// SECURITY: Prevent any permission requests from renderer
app.on('web-contents-created', (_event, contents) => {
  contents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
});
