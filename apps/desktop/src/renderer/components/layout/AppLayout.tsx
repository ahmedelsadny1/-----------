// ============================================
// App Layout — Sidebar + Content
// ============================================

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const navItems = [
  { path: '/admin', label: 'لوحة التحكم', labelEn: 'Dashboard', icon: '📊' },
  { path: '/pos', label: 'نقطة البيع', labelEn: 'POS', icon: '🛒' },
  { path: '/admin/sales', label: 'سجل المبيعات', labelEn: 'Sales', icon: '💰' },
  { path: '/admin/inventory', label: 'المخزون والجرد', labelEn: 'Inventory', icon: '📋' },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, mode, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-surface-950">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-900 border-e border-surface-800 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-surface-800">
          <div className="w-9 h-9 bg-primary-600/20 border border-primary-500/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-surface-100">Supermarket POS</h1>
            <p className="text-[10px] text-surface-500">v0.1.0</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info + Status */}
        <div className="p-3 border-t border-surface-800 space-y-2">
          {/* Connection status */}
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-surface-400">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  mode === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span>{mode === 'ONLINE' ? 'متصل' : 'وضع محلي'}</span>
            </div>
          </div>
          {/* User */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-800/60 border border-surface-700/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-primary-600/20 text-primary-400 border border-primary-500/30 rounded-full flex items-center justify-center text-xs font-bold">
                {user?.fullName ? user.fullName[0]?.toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-surface-200 truncate">
                  {user?.fullName || 'مستخدم غير مسجل'}
                </p>
                <p className="text-[10px] text-surface-400 truncate">
                  {user?.roles?.join(', ') || 'كاشير'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-1.5 text-surface-400 hover:text-danger-400 hover:bg-surface-700/50 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
