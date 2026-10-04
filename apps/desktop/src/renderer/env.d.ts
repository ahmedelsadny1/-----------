// ============================================
// Type declarations for the Electron IPC API
// ============================================
// This file provides TypeScript types for window.api in the renderer.

import type { ElectronAPI } from '../preload/index';

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
