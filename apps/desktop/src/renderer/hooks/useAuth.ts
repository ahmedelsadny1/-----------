import { useAuthStore } from '../stores/auth.store.js';

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const mode = useAuthStore((state) => state.mode);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const checkSession = useAuthStore((state) => state.checkSession);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  return {
    user,
    token,
    mode,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    checkSession,
    hasPermission,
  };
}
