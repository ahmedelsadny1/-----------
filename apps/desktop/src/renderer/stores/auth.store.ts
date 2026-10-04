import { create } from 'zustand';

export interface User {
  id: string;
  companyId: string;
  username: string;
  email?: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  branches: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  mode: 'ONLINE' | 'OFFLINE' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  mode: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = (await (window as any).api?.auth?.login(username, password)) as any;

      if (result && result.success) {
        set({
          user: result.user,
          token: result.token,
          mode: result.mode,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({
          error: result?.error || 'فشل تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور',
          isLoading: false,
        });
        return false;
      }
    } catch (err: any) {
      set({
        error: err.message || 'حدث خطأ أثناء تسجيل الدخول',
        isLoading: false,
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await (window as any).api?.auth?.logout();
    } finally {
      set({
        user: null,
        token: null,
        mode: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  checkSession: async () => {
    try {
      const session = (await (window as any).api?.auth?.getSession()) as any;
      if (session && session.user) {
        set({
          user: session.user,
          token: session.token,
          isAuthenticated: true,
          mode: session.token?.startsWith('offline_') ? 'OFFLINE' : 'ONLINE',
        });
      }
    } catch (err) {
      console.error('[AuthStore] Failed checking session:', err);
    }
  },

  hasPermission: (permission: string) => {
    const { user } = get();
    if (!user) return false;
    if (user.roles?.includes('super_admin')) return true;
    return user.permissions?.includes(permission) || false;
  },
}));
