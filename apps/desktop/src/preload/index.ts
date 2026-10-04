// ============================================
// Preload Script — Secure IPC Bridge
// ============================================
// This is the ONLY bridge between the Renderer (React) and Main Process.
// The renderer accesses these APIs via window.api.
// No Node.js APIs are exposed to the renderer.

import { contextBridge, ipcRenderer } from 'electron';

// ---- Type-safe API exposed to the renderer ----

const api = {
  // ---- Application ----
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
    getPlatform: (): Promise<string> => ipcRenderer.invoke('app:get-platform'),
  },

  // ---- Authentication ----
  // Will be implemented in Phase 3
  auth: {
    login: (username: string, password: string): Promise<unknown> =>
      ipcRenderer.invoke('auth:login', username, password),
    logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),
    getSession: (): Promise<unknown> => ipcRenderer.invoke('auth:get-session'),
  },

  // ---- Products ----
  // Will be implemented in Phase 5
  products: {
    search: (query: string): Promise<unknown> =>
      ipcRenderer.invoke('products:search', query),
    getByBarcode: (barcode: string): Promise<unknown> =>
      ipcRenderer.invoke('products:get-by-barcode', barcode),
    getById: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('products:get-by-id', id),
    list: (params?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('products:list', params),
    listCategories: (): Promise<unknown> =>
      ipcRenderer.invoke('products:list-categories'),
    create: (product: unknown): Promise<unknown> =>
      ipcRenderer.invoke('products:create', product),
    update: (id: string, product: unknown): Promise<unknown> =>
      ipcRenderer.invoke('products:update', id, product),
  },

  // ---- Sales ----
  // Will be implemented in Phase 7
  sales: {
    create: (sale: unknown): Promise<unknown> =>
      ipcRenderer.invoke('sales:create', sale),
    getById: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('sales:get-by-id', id),
    getByInvoice: (invoiceNumber: string): Promise<unknown> =>
      ipcRenderer.invoke('sales:get-by-invoice', invoiceNumber),
    list: (params?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('sales:list', params),
    cancel: (id: string, reason: string): Promise<unknown> =>
      ipcRenderer.invoke('sales:cancel', id, reason),
    refund: (params: unknown): Promise<unknown> =>
      ipcRenderer.invoke('sales:refund', params),
  },

  // ---- Cart ----
  // Will be implemented in Phase 7
  cart: {
    hold: (cart: unknown): Promise<unknown> =>
      ipcRenderer.invoke('cart:hold', cart),
    getHeld: (): Promise<unknown> => ipcRenderer.invoke('cart:get-held'),
    deleteHeld: (id: string): Promise<void> =>
      ipcRenderer.invoke('cart:delete-held', id),
  },

  // ---- Inventory ----
  // Will be implemented in Phase 8
  inventory: {
    list: (limit?: number): Promise<unknown> =>
      ipcRenderer.invoke('inventory:list', limit),
    getStock: (productId: string): Promise<unknown> =>
      ipcRenderer.invoke('inventory:get-stock', productId),
    adjust: (adjustment: unknown): Promise<unknown> =>
      ipcRenderer.invoke('inventory:adjust', adjustment),
    getMovements: (params?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('inventory:get-movements', params),
  },

  // ---- Cash Sessions ----
  cashSessions: {
    open: (openingAmount: number): Promise<unknown> =>
      ipcRenderer.invoke('cash-sessions:open', openingAmount),
    close: (closingData: unknown): Promise<unknown> =>
      ipcRenderer.invoke('cash-sessions:close', closingData),
    getCurrent: (): Promise<unknown> =>
      ipcRenderer.invoke('cash-sessions:get-current'),
  },

  // ---- Expenses (Petty Cash) ----
  expenses: {
    list: (sessionId?: string): Promise<unknown> =>
      ipcRenderer.invoke('expenses:list', sessionId),
    categories: (): Promise<unknown> =>
      ipcRenderer.invoke('expenses:categories'),
    create: (params: unknown): Promise<unknown> =>
      ipcRenderer.invoke('expenses:create', params),
  },

  // ---- Customers ----
  // Will be implemented in Phase 10
  customers: {
    search: (query: string): Promise<unknown> =>
      ipcRenderer.invoke('customers:search', query),
    create: (customer: unknown): Promise<unknown> =>
      ipcRenderer.invoke('customers:create', customer),
    getById: (id: string): Promise<unknown> =>
      ipcRenderer.invoke('customers:get-by-id', id),
  },

  // ---- Sync ----
  // Will be implemented in Phase 13
  sync: {
    getStatus: (): Promise<unknown> => ipcRenderer.invoke('sync:get-status'),
    triggerSync: (): Promise<void> => ipcRenderer.invoke('sync:trigger'),
    getHistory: (params?: unknown): Promise<unknown> =>
      ipcRenderer.invoke('sync:get-history', params),
  },

  // ---- Hardware ----
  // Will be implemented in Phase 17
  hardware: {
    printReceipt: (data: unknown): Promise<void> =>
      ipcRenderer.invoke('hardware:print-receipt', data),
    openDrawer: (): Promise<void> => ipcRenderer.invoke('hardware:open-drawer'),
    testPrinter: (): Promise<unknown> =>
      ipcRenderer.invoke('hardware:test-printer'),
  },

  // ---- Settings ----
  settings: {
    get: (key: string): Promise<unknown> =>
      ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown): Promise<void> =>
      ipcRenderer.invoke('settings:set', key, value),
    getAll: (): Promise<unknown> => ipcRenderer.invoke('settings:get-all'),
  },

  // ---- Backup ----
  // Will be implemented in Phase 16
  backup: {
    create: (): Promise<unknown> => ipcRenderer.invoke('backup:create'),
    restore: (filePath: string): Promise<unknown> =>
      ipcRenderer.invoke('backup:restore', filePath),
    list: (): Promise<unknown> => ipcRenderer.invoke('backup:list'),
  },

  // ---- Reports ----
  // Will be implemented in Phase 15
  reports: {
    sales: (params: unknown): Promise<unknown> =>
      ipcRenderer.invoke('reports:sales', params),
    inventory: (params: unknown): Promise<unknown> =>
      ipcRenderer.invoke('reports:inventory', params),
    cashier: (params: unknown): Promise<unknown> =>
      ipcRenderer.invoke('reports:cashier', params),
    financial: (params: unknown): Promise<unknown> =>
      ipcRenderer.invoke('reports:financial', params),
  },

  // ---- Event Listeners (Main → Renderer) ----
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = [
      'sync:status-changed',
      'sync:operation-completed',
      'connectivity:changed',
      'notification:received',
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  off: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },
};

// Expose the API to the renderer via window.api
contextBridge.exposeInMainWorld('api', api);

// Type declaration for the renderer
export type ElectronAPI = typeof api;
