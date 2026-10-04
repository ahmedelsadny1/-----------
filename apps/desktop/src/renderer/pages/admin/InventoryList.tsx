import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  barcode?: string;
  sku: string;
  quantity: number;
  minQuantity: number;
  reorderPoint: number;
}

export function InventoryListPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Adjustment Modal State
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [qtyChange, setQtyChange] = useState<string>('');
  const [adjustType, setAdjustType] = useState<string>('ADJUSTMENT');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      if (window.api?.inventory?.list) {
        const res = (await window.api.inventory.list(200)) as any;
        if (res?.success) {
          setItems(res.data);
        }
      }
    } catch (err) {
      console.error('Failed to load local inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const change = parseInt(qtyChange, 10);
    if (isNaN(change) || change === 0) {
      alert('يرجى إدخال مقدار التعديل (موجب للإضافة أو سالب للخصم)');
      return;
    }

    setSubmitting(true);
    try {
      if (window.api?.inventory?.adjust) {
        const res = (await window.api.inventory.adjust({
          productId: adjustingItem.productId,
          quantityChange: change,
          movementType: adjustType,
          notes: notes || 'تعديل يدوي من الشاشة المحلية',
          createdBy: user?.id,
        })) as any;

        if (res?.success) {
          setActionSuccess(`تم تعديل رصيد ${adjustingItem.productName} بنجاح`);
          setAdjustingItem(null);
          setQtyChange('');
          setNotes('');
          fetchInventory();
          setTimeout(() => setActionSuccess(null), 4000);
        } else {
          alert('فشل تعديل الرصيد: ' + res?.error);
        }
      }
    } catch (err: any) {
      alert('خطأ أثناء التعديل: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      (item.barcode && item.barcode.includes(search));

    const matchesLowStock = !filterLowStock || item.quantity <= item.reorderPoint;
    return matchesSearch && matchesLowStock;
  });

  const lowStockCount = items.filter((i) => i.quantity <= i.reorderPoint).length;
  const outOfStockCount = items.filter((i) => i.quantity <= 0).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-surface-100">إدارة المخزون والكميات المحلية</h1>
          <p className="text-sm text-surface-400">متابعة أرصدة الأصناف وتسجيل حركات وتعديلات الجرد</p>
        </div>
        <button
          onClick={fetchInventory}
          className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-surface-200 rounded-xl text-sm font-medium border border-surface-700 transition-colors"
        >
          <span>🔄</span>
          <span>تحديث الأرصدة</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center gap-2">
          <span>✓</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-surface-400">إجمالي الأصناف المسجلة</p>
          <p className="text-2xl font-black text-surface-100 mt-1">{items.length}</p>
        </div>
        <div
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            filterLowStock
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
              : 'bg-surface-900 border-surface-800 hover:border-surface-700'
          }`}
        >
          <p className="text-xs font-medium text-surface-400">أصناف قاربت على النفاد (حد الطلب)</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{lowStockCount}</p>
        </div>
        <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-surface-400">أصناف نفدت بالكامل (رصيد صفر)</p>
          <p className="text-2xl font-black text-rose-400 mt-1">{outOfStockCount}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الباركود، أو الـ SKU..."
            className="w-full bg-surface-900 border border-surface-800 rounded-xl px-4 py-2.5 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>

        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
            filterLowStock
              ? 'bg-amber-500 text-surface-950 border-amber-400 font-bold'
              : 'bg-surface-900 text-surface-300 border-surface-800 hover:bg-surface-800'
          }`}
        >
          {filterLowStock ? 'إلغاء تصفية حد الطلب' : 'تصفية الأصناف المنخفضة فقط'}
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-surface-400">جاري تحميل بيانات المخزون...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-surface-500">لا توجد أصناف مطابقة للبحث</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-surface-950/60 border-b border-surface-800 text-xs font-semibold text-surface-400">
                <tr>
                  <th className="px-5 py-3.5">الباركود</th>
                  <th className="px-5 py-3.5">اسم الصنف</th>
                  <th className="px-5 py-3.5">SKU</th>
                  <th className="px-5 py-3.5 text-center">الرصيد الحالي</th>
                  <th className="px-5 py-3.5 text-center">حد الطلب</th>
                  <th className="px-5 py-3.5">حالة المخزون</th>
                  <th className="px-5 py-3.5 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 text-surface-200">
                {filteredItems.map((item) => {
                  const isOutOfStock = item.quantity <= 0;
                  const isLow = item.quantity <= item.reorderPoint && !isOutOfStock;

                  return (
                    <tr key={item.id} className="hover:bg-surface-800/40 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-surface-400">{item.barcode || '—'}</td>
                      <td className="px-5 py-4 font-semibold text-surface-100">{item.productName}</td>
                      <td className="px-5 py-4 font-mono text-xs text-surface-400">{item.sku}</td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`font-mono text-base font-bold ${
                            isOutOfStock
                              ? 'text-rose-400'
                              : isLow
                              ? 'text-amber-400'
                              : 'text-surface-100'
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center font-mono text-xs text-surface-400">
                        {item.reorderPoint}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isOutOfStock
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isOutOfStock ? 'نفد المخزون' : isLow ? 'منخفض' : 'متوفر'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => {
                            setAdjustingItem(item);
                            setQtyChange('');
                            setNotes('');
                          }}
                          className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          تعديل رصيد ⚖️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-surface-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-surface-100">تسوية رصيد المخزون</h3>
                <p className="text-xs text-surface-400 mt-0.5">{adjustingItem.productName}</p>
              </div>
              <button
                onClick={() => setAdjustingItem(null)}
                className="w-8 h-8 rounded-full bg-surface-800 hover:bg-surface-700 text-surface-400 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <div className="bg-surface-950/60 p-4 rounded-xl border border-surface-800 flex justify-between items-center text-sm">
                <span className="text-surface-400">الرصيد الحالي بالمخزن:</span>
                <span className="font-mono font-bold text-lg text-surface-100">{adjustingItem.quantity}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  مقدار التعديل (مثال: +10 للإضافة، -3 للنقص أو التلف)
                </label>
                <input
                  type="number"
                  required
                  value={qtyChange}
                  onChange={(e) => setQtyChange(e.target.value)}
                  placeholder="أدخل الكمية..."
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-primary-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">سبب التعديل</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="ADJUSTMENT">جرد فعلي وتصحيح رصيد</option>
                  <option value="DAMAGE">تلف أو انتهاء صلاحية</option>
                  <option value="OPENING">رصيد أول المدة</option>
                  <option value="RETURN">مرتجع أو تسوية إدارية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">ملاحظات إضافية (اختياري)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="رقم محضر الجرد أو تفاصيل أخرى..."
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 text-sm text-surface-100 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-sm font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-primary-600/30 transition-all"
                >
                  {submitting ? 'جاري الحفظ...' : 'تأكيد التعديل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
