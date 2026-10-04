import React, { useState, useEffect } from 'react';

interface LocalSale {
  id: string;
  invoiceNumber: string;
  customerName?: string;
  totalAmount: number; // in piasters
  paidAmount: number;
  status: string;
  paymentMethod: string;
  itemsCount: number;
  createdAt: string;
}

export function SalesListPage() {
  const [sales, setSales] = useState<LocalSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      if (window.api?.sales?.list) {
        const res = (await window.api.sales.list(100)) as any;
        if (res?.success) {
          setSales(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to load local sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleViewDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      if (window.api?.sales?.getById) {
        const res = (await window.api.sales.getById(id)) as any;
        if (res?.success) {
          setSelectedSale(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sale details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredSales = sales.filter((s) =>
    s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())),
  );

  const totalRevenue = sales
    .filter((s) => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const formatCurrency = (piasters: number) => {
    return (piasters / 100).toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ج.م';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-surface-100">سجل فواتير المبيعات المحلية</h1>
          <p className="text-sm text-surface-400">عرض ومتابعة الفواتير المحفوظة في قاعدة بيانات الجهاز محلياً</p>
        </div>
        <button
          onClick={fetchSales}
          className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-surface-200 rounded-xl text-sm font-medium border border-surface-700 transition-colors"
        >
          <span>🔄</span>
          <span>تحديث</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-surface-400">إجمالي الفواتير المحفوظة</p>
          <p className="text-2xl font-black text-surface-100 mt-1">{sales.length}</p>
        </div>
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-surface-400">إجمالي إيراد الفواتير</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-surface-400">متوسط قيمة الفاتورة</p>
          <p className="text-2xl font-black text-primary-400 mt-1">
            {sales.length > 0 ? formatCurrency(Math.round(totalRevenue / sales.length)) : '0.00 ج.م'}
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الفاتورة أو اسم العميل..."
            className="w-full bg-surface-900 border border-surface-800 rounded-xl px-4 py-2.5 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-surface-400">جاري تحميل الفواتير...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-12 text-center text-surface-500">لا توجد فواتير مطابقة للبحث</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-surface-950/60 border-b border-surface-800 text-xs font-semibold text-surface-400">
                <tr>
                  <th className="px-5 py-3.5">رقم الفاتورة</th>
                  <th className="px-5 py-3.5">التاريخ والوقت</th>
                  <th className="px-5 py-3.5">العميل</th>
                  <th className="px-5 py-3.5">عدد الأصناف</th>
                  <th className="px-5 py-3.5">طريقة الدفع</th>
                  <th className="px-5 py-3.5">الإجمالي</th>
                  <th className="px-5 py-3.5">الحالة</th>
                  <th className="px-5 py-3.5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 text-surface-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-surface-100">{sale.invoiceNumber}</td>
                    <td className="px-5 py-4 text-xs text-surface-400">
                      {new Date(sale.createdAt).toLocaleString('ar-EG')}
                    </td>
                    <td className="px-5 py-4">{sale.customerName || 'عميل نقدي'}</td>
                    <td className="px-5 py-4 text-surface-400">{sale.itemsCount} صنف</td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-800 text-surface-300">
                        {sale.paymentMethod === 'CASH' ? 'نقدي 💵' : 'بطاقة 💳'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-emerald-400">{formatCurrency(sale.totalAmount)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          sale.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {sale.status === 'COMPLETED' ? 'مكتملة' : 'ملغاة'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => handleViewDetails(sale.id)}
                        className="px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 border border-primary-500/30 rounded-lg text-xs font-medium transition-colors"
                      >
                        عرض التفاصيل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-surface-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-surface-100">
                  تفاصيل الفاتورة: #{selectedSale.invoice_number}
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  {new Date(selectedSale.created_at).toLocaleString('ar-EG')}
                </p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="w-8 h-8 rounded-full bg-surface-800 hover:bg-surface-700 text-surface-400 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 bg-surface-950/60 p-4 rounded-xl border border-surface-800 text-xs">
                <div>
                  <span className="text-surface-500">العميل:</span>
                  <span className="text-surface-200 font-semibold me-1">
                    {selectedSale.customer_name || 'عميل نقدي'}
                  </span>
                </div>
                <div>
                  <span className="text-surface-500">الحالة:</span>
                  <span className="text-emerald-400 font-bold me-1">
                    {selectedSale.status === 'COMPLETED' ? 'مكتملة' : 'ملغاة'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">الأصناف</h4>
                <div className="bg-surface-950/40 border border-surface-800 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-surface-800/40 text-surface-400">
                      <tr>
                        <th className="p-3">الصنف</th>
                        <th className="p-3 text-center">الكمية</th>
                        <th className="p-3 text-center">سعر الوحدة</th>
                        <th className="p-3 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800/50">
                      {selectedSale.items?.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-3 text-surface-200 font-medium">{item.product_name}</td>
                          <td className="p-3 text-center text-surface-300 font-bold">{item.quantity}</td>
                          <td className="p-3 text-center text-surface-400">{formatCurrency(item.unit_price)}</td>
                          <td className="p-3 text-left font-bold text-surface-100">{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="space-y-2 bg-surface-950/80 p-4 rounded-xl border border-surface-800 text-sm">
                <div className="flex justify-between text-surface-400 text-xs">
                  <span>المجموع الفرعي:</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                {selectedSale.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-400 text-xs">
                    <span>الخصم:</span>
                    <span>-{formatCurrency(selectedSale.discount_amount)}</span>
                  </div>
                )}
                {selectedSale.tax_amount > 0 && (
                  <div className="flex justify-between text-surface-400 text-xs">
                    <span>ضريبة القيمة المضافة:</span>
                    <span>+{formatCurrency(selectedSale.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-surface-100 font-black text-base pt-2 border-t border-surface-800">
                  <span>الإجمالي الكلي:</span>
                  <span className="text-emerald-400">{formatCurrency(selectedSale.total_amount)}</span>
                </div>
                <div className="flex justify-between text-surface-400 text-xs">
                  <span>المبلغ المدفوع:</span>
                  <span>{formatCurrency(selectedSale.paid_amount)}</span>
                </div>
                {selectedSale.change_amount > 0 && (
                  <div className="flex justify-between text-primary-400 text-xs">
                    <span>الباقي (الفكة):</span>
                    <span>{formatCurrency(selectedSale.change_amount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-surface-800 flex justify-end gap-3 bg-surface-950/40">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-sm font-medium transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
