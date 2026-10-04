// ============================================
// Root App Component
// ============================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/Login';
import { POSPage } from './pages/POS';
import { DashboardPage } from './pages/admin/Dashboard';
import { SalesListPage } from './pages/admin/SalesList';
import { InventoryListPage } from './pages/admin/InventoryList';
import { AppLayout } from './components/layout/AppLayout';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* POS — Full screen, no sidebar */}
        <Route path="/pos" element={<POSPage />} />

        {/* Admin — Sidebar layout */}
        <Route path="/admin" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="sales" element={<SalesListPage />} />
          <Route path="inventory" element={<InventoryListPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
