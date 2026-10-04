// ============================================
// Login Page — Full Implementation (Phase 3)
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin1234!');
  const { login, isAuthenticated, isLoading, error, mode, checkSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/pos', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    const success = await login(username.trim(), password);
    if (success) {
      navigate('/pos', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950 select-none">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Logo / Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 border border-primary-500/30 rounded-2xl mb-4 shadow-lg shadow-primary-900/20">
            <svg
              className="w-8 h-8 text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-surface-100 tracking-tight">نظام نقطة البيع المتكامل</h1>
          <p className="text-surface-400 mt-1 text-sm">Supermarket POS & Cashier System</p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleLogin}
          className="glass-panel p-8 animate-slide-up shadow-2xl backdrop-blur-xl border border-surface-700/50"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-surface-200">تسجيل الدخول</h2>
            {mode && (
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  mode === 'ONLINE'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {mode === 'ONLINE' ? 'متصل بالخادم' : 'وضع بدون إنترنت'}
              </span>
            )}
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-danger-500/15 border border-danger-500/30 rounded-lg text-danger-300 text-sm flex items-center gap-2 animate-shake">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-surface-300 mb-1.5"
              >
                اسم المستخدم
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-base"
                placeholder="أدخل اسم المستخدم"
                autoFocus
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-surface-300 mb-1.5"
              >
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="أدخل كلمة المرور"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full mt-6 py-3 flex items-center justify-center gap-2 font-medium"
          >
            {isLoading ? (
              <>
                <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>جاري التحقق...</span>
              </>
            ) : (
              <span>دخول</span>
            )}
          </button>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-surface-800/80 text-xs text-surface-400">
            <p className="font-semibold text-surface-300 mb-2">بيانات تجريبية سريعة:</p>
            <div className="grid grid-cols-2 gap-2 text-surface-400">
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('Admin1234!');
                }}
                className="p-2 text-right bg-surface-800/50 hover:bg-surface-800 rounded border border-surface-700/50 transition-colors"
              >
                <div className="font-medium text-surface-200">المدير العام</div>
                <div className="text-[11px] text-surface-500">admin / Admin1234!</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('cashier1');
                  setPassword('Cashier1234!');
                }}
                className="p-2 text-right bg-surface-800/50 hover:bg-surface-800 rounded border border-surface-700/50 transition-colors"
              >
                <div className="font-medium text-surface-200">كاشير</div>
                <div className="text-[11px] text-surface-500">cashier1 / Cashier1234!</div>
              </button>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-2 mt-6 text-xs text-surface-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>يدعم العمل دون اتصال بالإنترنت (Offline-First)</span>
          </div>
        </form>
      </div>
    </div>
  );
}
