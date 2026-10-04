import { create } from 'zustand';

export interface AdminUser {
  id: string;
  companyId: string;
  username: string;
  email?: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  branches: string[];
}

interface AdminAuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  initialize: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize: () => {
    try {
      const stored = localStorage.getItem('pos_admin_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.user) {
          set({
            user: parsed.user,
            token: parsed.token,
            isAuthenticated: true,
          });
        }
      }
    } catch (e) {
      console.error('Failed restoring auth state:', e);
    }
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const { accessToken, user } = data.data;

        // Check if user is an admin or manager
        const allowedRoles = ['super_admin', 'company_admin', 'branch_manager', 'accountant'];
        const hasAccess = user.roles.some((r: string) => allowedRoles.includes(r));

        if (!hasAccess) {
          set({
            error: 'عذراً، هذا الحساب مخصص للكاشير فقط ولا يملك صلاحية دخول لوحة الإدارة.',
            isLoading: false,
          });
          return false;
        }

        const statePayload = { token: accessToken, user };
        localStorage.setItem('pos_admin_auth', JSON.stringify(statePayload));

        set({
          user,
          token: accessToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } else {
        set({
          error: data?.error?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة',
          isLoading: false,
        });
        return false;
      }
    } catch (err: any) {
      set({
        error: err.message || 'تعذر الاتصال بخادم النظام',
        isLoading: false,
      });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('pos_admin_auth');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));
