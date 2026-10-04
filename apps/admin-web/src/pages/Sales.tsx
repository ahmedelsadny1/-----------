import React, { useState, useEffect } from 'react';
import { useAdminAuthStore } from '../stores/auth.store.js';

export function SalesPage() {
  const { token } = useAdminAuthStore();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/v1/sales', window.location.origin);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSales(json.data?.items || []);
      }
    } catch (err) {
      console.error('Failed to load cloud sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [search]);

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
          <h1 className="text-2xl font-black text-surface-100">سجل المبيعات والفواتير المركزي</h1>
          <p className="text-xs text-surface-400">متابعة عمليات البيع الحية والمزامنة عبر كافة الفروع</p>
        </div>
        <button
          onClick={fetchSales}
          className="px-4 py-2 bg-surface-900 hover:bg-surface-800 text-surface-200 rounded-xl text-xs font-medium border border-surface-800 transition-colors"
        >
          🔄 تحديث الفواتير
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث برقم الفاتورة..."
          className="w-full bg-surface-900 border border-surface-800 rounded-xl px-4 py-2.5 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-primary-500 transition-colors"
        />
      </div>

      {/* Sales Table */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-surface-400">جاري تحميل سجل المبيعات...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-surface-500">لا توجد فواتير مطابقة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-surface-950/60 border-b border-surface-800 text-xs font-semibold text-surface-400">
                <tr>
                  <th className="px-5 py-3.5">رقم الفاتورة</th>
                  <th className="px-5 py-3.5">الفرع</th>
                  <th className="px-5 py-3.5">الكاشير</th>
                  <th className="px-5 py-3.5">التاريخ والوقت</th>
                  <th className="px-5 py-3.5 text-center">الأصناف</th>
                  <th className="px-5 py-3.5">الإجمالي</th>
                  <th className="px-5 py-3.5">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 text-surface-200">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-surface-100">{s.invoice_number}</td>
                    <td className="px-5 py-4 text-xs text-surface-300">{s.branch_name}</td>
                    <td className="px-5 py-4 text-xs text-surface-300">{s.cashier_name}</td>
                    <td className="px-5 py-4 text-xs text-surface-400">
                      {new Date(s.created_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="px-5 py-4 text-center font-mono">{s.items_count}</td>
                    <td className="px-5 py-4 font-bold text-emerald-400 font-mono">
                      {formatCurrency(s.total_amount)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          s.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {s.status === 'COMPLETED' ? 'مكتملة' : 'ملغاة'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
