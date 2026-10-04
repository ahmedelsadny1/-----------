// ============================================
// Admin Dashboard Page — Placeholder (Phase 14)
// ============================================

export function DashboardPage() {
  const stats = [
    { label: 'مبيعات اليوم', value: '0.00 ج.م', icon: '💰', color: 'primary' },
    { label: 'المعاملات', value: '0', icon: '🧾', color: 'accent' },
    { label: 'الربح الإجمالي', value: '0.00 ج.م', icon: '📈', color: 'green' },
    { label: 'المنتجات', value: '0', icon: '📦', color: 'blue' },
    { label: 'مخزون منخفض', value: '0', icon: '⚠️', color: 'amber' },
    { label: 'نفاد المخزون', value: '0', icon: '🔴', color: 'red' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-100">لوحة التحكم</h1>
        <p className="text-surface-400 mt-1">نظرة عامة على النظام</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stats-card">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="stats-card-value">{stat.value}</p>
                <p className="stats-card-label">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card min-h-[300px] flex items-center justify-center">
          <div className="text-center text-surface-500">
            <p className="text-lg">📊 رسم بياني للمبيعات</p>
            <p className="text-sm mt-1">سيتم تفعيله في المرحلة 15</p>
          </div>
        </div>
        <div className="card min-h-[300px] flex items-center justify-center">
          <div className="text-center text-surface-500">
            <p className="text-lg">📊 أفضل المنتجات</p>
            <p className="text-sm mt-1">سيتم تفعيله في المرحلة 15</p>
          </div>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="card p-4 border-primary-500/30">
        <p className="text-sm text-surface-400">
          <span className="badge-info">المرحلة 1</span>
          <span className="ms-2">تأسيس المشروع — البيانات الحقيقية ستظهر بعد إكمال المراحل التالية</span>
        </p>
      </div>
    </div>
  );
}
