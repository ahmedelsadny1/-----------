import React, { useState, useEffect } from 'react';
import { useAdminAuthStore } from '../stores/auth.store.js';

export function ReportsPage() {
  const { token } = useAdminAuthStore();
  const [profitMargins, setProfitMargins] = useState<any | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [deadStock, setDeadStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Profit margins
      const marginsRes = await fetch('/api/v1/reports/profit-margins', { headers });
      if (marginsRes.ok) {
        const json = await marginsRes.json();
        setProfitMargins(json.data);
      }

      // 2. Top Products
      const topRes = await fetch('/api/v1/reports/top-products?limit=5', { headers });
      if (topRes.ok) {
        const json = await topRes.json();
        setTopProducts(json.data || []);
      }

      // 3. Dead Stock
      const deadRes = await fetch('/api/v1/reports/dead-stock?daysWithoutSale=30', { headers });
      if (deadRes.ok) {
        const json = await deadRes.json();
        setDeadStock(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const formatCurrency = (piasters: number) => {
    return (piasters / 100).toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ج.م';
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-surface-100">التقارير التحليلية والأرباح المركزية</h1>
          <p className="text-xs text-surface-400">مؤشرات الأداء المالي، هوامش الربح، والأصناف الراكدة</p>
        </div>
        <button
          onClick={fetchReports}
          className="px-4 py-2 bg-surface-900 hover:bg-surface-800 text-surface-200 rounded-xl text-xs font-medium border border-surface-800 transition-colors"
        >
          🔄 تحديث التقارير
        </button>
      </div>

      {/* Financial KPIs */}
      {profitMargins && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
            <p className="text-xs font-medium text-surface-400">إجمالي المبيعات (Gross Revenue)</p>
            <p className="text-2xl font-black text-surface-100 mt-1">
              {formatCurrency(profitMargins.gross_revenue || 0)}
            </p>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
            <p className="text-xs font-medium text-surface-400">تكلفة البضاعة المباعة (COGS)</p>
            <p className="text-2xl font-black text-rose-400 mt-1">
              {formatCurrency(profitMargins.cogs || 0)}
            </p>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
            <p className="text-xs font-medium text-surface-400">صافي الربح الإجمالي (Gross Profit)</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {formatCurrency(profitMargins.gross_profit || 0)}
            </p>
          </div>
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
            <p className="text-xs font-medium text-surface-400">نسبة هامش الربح</p>
            <p className="text-2xl font-black text-primary-400 mt-1">
              {profitMargins.marginPercent || '0%'}
            </p>
          </div>
        </div>
      )}

      {/* Grid: Top Products & Dead Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
              <span>🔥</span>
              <span>الأصناف الأكثر مبيعاً وتحقيقاً للإيراد</span>
            </h3>
          </div>

          <div className="border border-surface-800/80 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-950/60 text-surface-400">
                <tr>
                  <th className="p-3">الصنف</th>
                  <th className="p-3 text-center">الكمية</th>
                  <th className="p-3 text-left">الإيراد</th>
                  <th className="p-3 text-left">الربح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {topProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-surface-800/30">
                    <td className="p-3 font-semibold text-surface-100">{p.product_name_ar || p.product_name}</td>
                    <td className="p-3 text-center font-mono font-bold text-surface-300">
                      {p.total_quantity_sold}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-400">
                      {formatCurrency(p.total_revenue)}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-primary-400">
                      {formatCurrency(p.total_profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dead Stock Alert */}
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
              <span>💤</span>
              <span>بضاعة راكدة (لم تُبع منذ أكثر من 30 يوماً)</span>
            </h3>
          </div>

          <div className="border border-surface-800/80 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-950/60 text-surface-400">
                <tr>
                  <th className="p-3">الصنف</th>
                  <th className="p-3 text-center">الرصيد بالمخزن</th>
                  <th className="p-3 text-left">رأس المال المعطل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {deadStock.map((d, idx) => (
                  <tr key={idx} className="hover:bg-surface-800/30">
                    <td className="p-3 font-semibold text-surface-200">{d.name_ar || d.name}</td>
                    <td className="p-3 text-center font-mono font-bold text-amber-400">
                      {d.current_stock}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-rose-400">
                      {formatCurrency(d.capital_tied_up)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
