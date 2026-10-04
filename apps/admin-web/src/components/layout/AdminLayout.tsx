import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../../stores/auth.store.js';

const navItems = [
  { path: '/dashboard', label: 'الرئيسية', icon: '📊' },
  { path: '/companies', label: 'الشركات', icon: '🏢' },
  { path: '/branches', label: 'الفروع والأجهزة', icon: '🏬' },
  { path: '/products', label: 'كتالوج المنتجات', icon: '📦' },
  { path: '/inventory', label: 'المخزون المركزي', icon: '📋' },
  { path: '/sales', label: 'المبيعات والفواتير', icon: '💰' },
  { path: '/users', label: 'المستخدمون والصلاحيات', icon: '👥' },
  { path: '/reports', label: 'التقارير والأرباح', icon: '📈' },
  { path: '/sync', label: 'مركز المزامنة', icon: '🔄' },
  { path: '/settings', label: 'الإعدادات العامة', icon: '⚙️' },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAdminAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-surface-950 text-surface-100">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-900 border-e border-surface-800 flex flex-col select-none">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-800">
          <div className="w-9 h-9 bg-primary-600/20 border border-primary-500/30 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-surface-100">Supermarket Admin</h1>
            <p className="text-[10px] text-surface-400">إدارة السوبرماركت المركزية</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 font-medium'
                    : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-3 border-t border-surface-800">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-800/50 border border-surface-700/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30 flex items-center justify-center font-bold text-xs">
                {user?.fullName ? user.fullName[0]?.toUpperCase() : 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-surface-200 truncate">{user?.fullName || 'Admin'}</p>
                <p className="text-[10px] text-surface-400 truncate">{user?.roles?.[0] || 'Super Admin'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-1.5 text-surface-400 hover:text-danger-400 hover:bg-surface-700 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-surface-900 border-b border-surface-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-surface-400">الشركة النشطة:</span>
            <span className="px-3 py-1 rounded-md bg-surface-800 border border-surface-700 text-xs font-semibold text-primary-400">
              سوبرماركت الأمل (الفرع الرئيسي)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              السيرفر متصل (Fastify API)
            </span>
          </div>
        </header>

        {/* Content Outlet */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
