import React from 'react';
import { useAdminAuthStore } from '../stores/auth.store.js';

export function DashboardPage() {
  const { user } = useAdminAuthStore();

  const stats = [
    { title: 'إجمالي المبيعات اليومية', value: '45,820 ج.م', change: '+12.5%', positive: true, icon: '💵' },
    { title: 'عدد الفواتير المنفذة', value: '342 فاتورة', change: '+8.1%', positive: true, icon: '🧾' },
    { title: 'الفروع النشطة', value: '3 / 3 فروع', change: '100% متصل', positive: true, icon: '🏬' },
    { title: 'تنبيهات انخفاض المخزون', value: '7 منتجات', change: 'يحتاج طلب شراء', positive: false, icon: '⚠️' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">
            مرحباً بك، {user?.fullName || 'مسؤول النظام'} 👋
          </h1>
          <p className="text-surface-400 text-sm mt-1">
            إليك ملخص النشاط المركزي لنقاط البيع والفروع اليوم.
          </p>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary-600/20">
            + إضافة منتج جديد
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="p-5 rounded-xl bg-surface-900 border border-surface-800 hover:border-surface-700 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{stat.icon}</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  stat.positive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                }`}
              >
                {stat.change}
              </span>
            </div>
            <p className="text-sm font-medium text-surface-400 mt-4">{stat.title}</p>
            <p className="text-2xl font-bold text-surface-100 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* System Status and Branches Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Status */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-surface-900 border border-surface-800">
          <h2 className="text-lg font-bold text-surface-200 mb-4">حالة الفروع وأجهزة الكاشير</h2>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-surface-800/40 border border-surface-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <h3 className="text-sm font-semibold text-surface-100">الفرع الرئيسي (BR-01)</h3>
                  <p className="text-xs text-surface-400">2 محطات كاشير نشطة • آخر مزامنة: منذ دقيقة</p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                متصل
              </span>
            </div>

            <div className="p-4 rounded-lg bg-surface-800/40 border border-surface-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <h3 className="text-sm font-semibold text-surface-100">فرع المعادي (BR-02)</h3>
                  <p className="text-xs text-surface-400">3 محطات كاشير نشطة • آخر مزامنة: منذ 3 دقائق</p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                متصل
              </span>
            </div>

            <div className="p-4 rounded-lg bg-surface-800/40 border border-surface-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <h3 className="text-sm font-semibold text-surface-100">فرع مدينة نصر (BR-03)</h3>
                  <p className="text-xs text-surface-400">1 محطة كاشير نشطة • آخر مزامنة: منذ 5 دقائق</p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                متصل
              </span>
            </div>
          </div>
        </div>

        {/* Sync Center Status */}
        <div className="p-6 rounded-xl bg-surface-900 border border-surface-800 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-surface-200 mb-2">محرك المزامنة السحابي</h2>
            <p className="text-xs text-surface-400 mb-4">
              إحصائيات العمليات المتزامنة ثنائية الاتجاه مع أجهزة الكاشير المحلية.
            </p>

            <div className="space-y-3">
              <div className="flex justify-between text-xs py-2 border-b border-surface-800">
                <span className="text-surface-400">العمليات المتزامنة اليوم:</span>
                <span className="font-semibold text-surface-200">1,280 عملية</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-b border-surface-800">
                <span className="text-surface-400">التعارضات المكتشفة:</span>
                <span className="font-semibold text-emerald-400">0 تعارض</span>
              </div>
              <div className="flex justify-between text-xs py-2 border-b border-surface-800">
                <span className="text-surface-400">متوسط زمن الاستجابة:</span>
                <span className="font-semibold text-surface-200">42ms</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-800">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>جميع الأجهزة متزامنة بنجاح</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
