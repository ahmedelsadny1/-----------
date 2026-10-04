import React, { useState, useEffect } from 'react';
import { useAdminAuthStore } from '../stores/auth.store.js';

interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  nameAr?: string;
  sellingPrice: number;
  costPrice: number;
  categoryName?: string;
  unitName?: string;
  branchStock?: number;
}

export function ProductsPage() {
  const { token, company } = useAdminAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Product Form
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/v1/products', window.location.origin);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data?.items || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sku,
          barcode: barcode || undefined,
          name,
          nameAr: nameAr || undefined,
          sellingPrice: Math.round(parseFloat(sellingPrice) * 100),
          costPrice: Math.round(parseFloat(costPrice) * 100),
          imageUrl: imageUrl || undefined,
          unitId: '01HQ000000000000000000UNIT1',
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setSku('');
        setBarcode('');
        setName('');
        setNameAr('');
        setSellingPrice('');
        setCostPrice('');
        setImageUrl('');
        fetchProducts();
      } else {
        const err = await res.json();
        alert('فشل إضافة المنتج: ' + (err.message || 'خطأ'));
      }
    } catch (err: any) {
      alert('خطأ: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="text-2xl font-black text-surface-100">كتالوج الأصناف والمنتجات</h1>
          <p className="text-xs text-surface-400">إدارة قاعدة بيانات السلع المركزية والأسعار وهوامش الربح</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary-600/30 flex items-center gap-2 transition-all"
        >
          <span>➕</span>
          <span>إضافة منتج جديد</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم، الباركود، أو الـ SKU..."
          className="w-full bg-surface-900 border border-surface-800 rounded-xl px-4 py-2.5 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-primary-500 transition-colors"
        />
      </div>

      {/* Products Table */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-surface-400">جاري تحميل كتالوج الأصناف...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-surface-500">لا توجد أصناف مطابقة للبحث</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-surface-950/60 border-b border-surface-800 text-xs font-semibold text-surface-400">
                <tr>
                  <th className="px-5 py-3.5">الباركود</th>
                  <th className="px-5 py-3.5">اسم الصنف</th>
                  <th className="px-5 py-3.5">القسم</th>
                  <th className="px-5 py-3.5 text-center">سعر التكلفة</th>
                  <th className="px-5 py-3.5 text-center">سعر البيع</th>
                  <th className="px-5 py-3.5 text-center">هامش الربح</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/60 text-surface-200">
                {products.map((p) => {
                  const profit = p.sellingPrice - p.costPrice;
                  const marginPct = p.sellingPrice > 0 ? ((profit / p.sellingPrice) * 100).toFixed(1) : '0';

                  return (
                    <tr key={p.id} className="hover:bg-surface-800/40 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs text-surface-400">{p.barcode || '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {(p as any).imageUrl || (p as any).image_url ? (
                            <img
                              src={(p as any).imageUrl || (p as any).image_url}
                              alt={p.name}
                              className="w-9 h-9 rounded-lg object-contain bg-surface-950 border border-surface-800 flex-shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-surface-950 border border-surface-800 flex items-center justify-center text-sm flex-shrink-0 text-surface-500">
                              📦
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-surface-100">{p.nameAr || p.name}</div>
                            {p.nameAr && <div className="text-xs text-surface-500">{p.name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-surface-400">{p.categoryName || 'عام'}</td>
                      <td className="px-5 py-4 text-center font-mono text-surface-400">
                        {formatCurrency(p.costPrice)}
                      </td>
                      <td className="px-5 py-4 text-center font-mono font-bold text-emerald-400">
                        {formatCurrency(p.sellingPrice)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary-500/10 text-primary-400 border border-primary-500/20">
                          +{marginPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-surface-800 flex items-center justify-between">
              <h3 className="text-lg font-black text-surface-100">إضافة صنف جديد للكتالوج</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-800 hover:bg-surface-700 text-surface-400 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1">SKU (رمز الصنف)</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="مثال: MILK-01"
                    className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 focus:outline-none focus:border-primary-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1">الباركود الدولي</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="امسح أو اكتب الباركود"
                    className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 focus:outline-none focus:border-primary-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1">اسم الصنف باللغة العربية</label>
                <input
                  type="text"
                  required
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="مثال: حليب المراعي كامل الدسم 1 لتر"
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1">اسم الصنف باللغة الإنجليزية</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Almarai Full Cream Milk 1L"
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1">سعر التكلفة (ج.م)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 focus:outline-none focus:border-primary-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-300 mb-1">سعر البيع للجمهور (ج.م)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 focus:outline-none focus:border-primary-500 font-mono font-bold text-emerald-400"
                  />
                </div>
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1">صورة المنتج (رفع صورة من الجهاز)</label>
                <div className="flex items-center gap-3 bg-surface-950 p-2.5 rounded-xl border border-surface-800">
                  {imageUrl ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-surface-900 border border-surface-700 flex-shrink-0">
                      <img src={imageUrl} alt="معاينة" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-0 right-0 bg-rose-600 text-white rounded-bl text-[10px] w-4 h-4 flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-surface-900 border border-dashed border-surface-700 flex items-center justify-center text-lg flex-shrink-0 text-surface-500">
                      📷
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setImageUrl(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-surface-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-800 file:text-primary-400 hover:file:bg-surface-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-medium transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-primary-600/30 transition-all"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ المنتج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
