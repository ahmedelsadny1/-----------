import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useCartStore, CartItem } from '../stores/cart.store.js';
import { PaymentModal } from '../components/pos/PaymentModal.js';
import { ReceiptModal } from '../components/pos/ReceiptModal.js';
import { HeldOrdersModal } from '../components/pos/HeldOrdersModal.js';
import { RefundModal } from '../components/pos/RefundModal.js';
import { ExpenseModal } from '../components/pos/ExpenseModal.js';
import { ShiftModal } from '../components/pos/ShiftModal.js';

export function POSPage() {
  const { user, mode, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const {
    items,
    customer,
    orderDiscountAmount,
    heldCarts,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    holdCart,
    getSubtotal,
    getTotalTax,
    getTotalDiscount,
    getTotalAmount,
    getItemsCount,
  } = useCartStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isHeldOpen, setIsHeldOpen] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load products & categories from local SQLite
  const loadCatalog = async () => {
    try {
      const prods = (await (window as any).api?.products?.search('')) || [];
      setProducts(prods);

      const cats = (await (window as any).api?.products?.listCategories?.()) || [];
      setCategories(cats);
    } catch (err) {
      console.error('[POS] Failed loading catalog:', err);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Keyboard shortcut listeners (e.g. F9 = Pay, F7 = Hold)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F9' && items.length > 0) {
        e.preventDefault();
        setIsPaymentOpen(true);
      } else if (e.key === 'F7' && items.length > 0) {
        e.preventDefault();
        holdCart();
      } else if (e.key === 'Escape') {
        setIsPaymentOpen(false);
        setIsHeldOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, holdCart]);

  // Handle barcode scanning or manual search submit
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      // 1. Try direct exact barcode match first
      const matched = (await (window as any).api?.products?.getByBarcode(searchQuery.trim())) as any;

      if (matched) {
        addItem(matched, 1);
        setSearchQuery('');
        return;
      }

      // 2. Otherwise search products by text
      const searchResults = (await (window as any).api?.products?.search(searchQuery.trim())) as any[];
      if (searchResults && searchResults.length > 0) {
        if (searchResults.length === 1) {
          addItem(searchResults[0], 1);
          setSearchQuery('');
        } else {
          setProducts(searchResults);
        }
      }
    } catch (err) {
      console.error('[POS] Barcode search error:', err);
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryName === selectedCategory || p.categoryId === selectedCategory)
    : products;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col select-none text-surface-100">
      {/* Top Navigation Bar */}
      <header className="h-14 bg-surface-900 border-b border-surface-800 flex items-center justify-between px-4 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600/20 border border-primary-500/30 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="font-bold text-surface-100 text-sm">نقطة البيع الكاشير — POS-01</span>

          {hasPermission('settings.view') && (
            <Link
              to="/admin"
              className="text-xs px-2.5 py-1 rounded bg-surface-800 hover:bg-surface-700 text-surface-300 transition-colors border border-surface-700/60 me-2"
            >
              ⚙️ لوحة الإدارة
            </Link>
          )}

          <button
            onClick={() => setIsRefundOpen(true)}
            className="text-xs px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors border border-amber-500/30 flex items-center gap-1"
          >
            <span>↩️</span>
            <span>مرتجع فواتير</span>
          </button>

          <button
            onClick={() => setIsExpenseOpen(true)}
            className="text-xs px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors border border-rose-500/30 flex items-center gap-1"
          >
            <span>💸</span>
            <span>صرف نثريات</span>
          </button>

          <button
            onClick={() => setIsShiftOpen(true)}
            className="text-xs px-2.5 py-1 rounded bg-primary-500/10 hover:bg-primary-500/20 text-primary-300 transition-colors border border-primary-500/30 flex items-center gap-1"
          >
            <span>⏱️</span>
            <span>الوردية والدرج</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Held Carts Badge */}
          {heldCarts.length > 0 && (
            <button
              onClick={() => setIsHeldOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/25 transition-colors animate-pulse"
            >
              <span>⏸️ طلبات معلقة:</span>
              <span className="w-4 h-4 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] font-bold">
                {heldCarts.length}
              </span>
            </button>
          )}

          {/* Connection Status */}
          <div className="flex items-center gap-2 text-xs bg-surface-800/80 px-2.5 py-1 rounded-full border border-surface-700/60">
            <span
              className={`w-2 h-2 rounded-full ${
                mode === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="text-surface-300 font-medium">
              {mode === 'ONLINE' ? 'متصل بالسيرفر' : 'محلي (أوفلاين)'}
            </span>
          </div>

          {/* Cashier Badge */}
          <div className="flex items-center gap-2 text-xs text-surface-300 bg-surface-800/80 px-3 py-1 rounded-full border border-surface-700/60">
            <span className="w-2 h-2 rounded-full bg-primary-400" />
            <span className="font-semibold">{user?.fullName || 'الكاشير'}</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="p-1.5 text-surface-400 hover:text-danger-400 hover:bg-surface-800 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Product Catalog & Scanner */}
        <section className="flex-1 flex flex-col p-4 overflow-hidden border-e border-surface-800/60">
          {/* Barcode Search Header */}
          <form onSubmit={handleSearchSubmit} className="mb-3">
            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 text-lg">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value === '') loadCatalog();
                }}
                className="w-full pr-12 pl-4 py-3 bg-surface-900 border border-surface-700/80 rounded-xl text-surface-100 placeholder-surface-500 text-base focus:outline-none focus:border-primary-500 shadow-inner"
                placeholder="امسح الباركود بجهاز المسح أو ابحث بالاسم / الكود... (اضغط Enter)"
                autoFocus
              />
            </div>
          </form>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === null
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                  : 'bg-surface-900 text-surface-400 hover:bg-surface-800 hover:text-surface-200 border border-surface-800'
              }`}
            >
              جميع المنتجات
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name || cat.nameAr)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedCategory === (cat.name || cat.nameAr)
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                    : 'bg-surface-900 text-surface-400 hover:bg-surface-800 hover:text-surface-200 border border-surface-800'
                }`}
              >
                <span>{cat.icon || '📁'}</span>
                <span>{cat.nameAr || cat.name}</span>
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const priceInEgp = ((p.sellingPrice || p.selling_price || 0) / 100).toFixed(2);
                const stock = p.currentStock !== undefined ? p.currentStock : p.quantity || 0;

                return (
                  <button
                    key={p.id}
                    onClick={() => addItem(p, 1)}
                    className="p-3.5 rounded-xl bg-surface-900/90 border border-surface-800/80 hover:border-primary-500/50 hover:bg-surface-850 hover:shadow-lg hover:shadow-primary-950/40 text-right transition-all flex flex-col justify-between active:scale-95 group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-surface-500 bg-surface-950 px-1.5 py-0.5 rounded">
                          {p.sku || p.barcode}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            stock > 10
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          مخزون: {stock}
                        </span>
                      </div>

                      {p.imageUrl && (
                        <div className="w-full h-24 mb-2 rounded-lg overflow-hidden bg-surface-950 flex items-center justify-center">
                          <img
                            src={p.imageUrl}
                            alt={p.nameAr || p.name}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              // If image fails to load, hide image element
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <h4 className="text-sm font-bold text-surface-100 line-clamp-2 group-hover:text-primary-300 transition-colors">
                        {p.nameAr || p.name}
                      </h4>
                      <p className="text-[11px] text-surface-400 mt-0.5 truncate">{p.name}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-surface-800/80 flex items-center justify-between">
                      <span className="text-base font-extrabold text-primary-400">
                        {priceInEgp} <span className="text-[11px] font-normal text-surface-400">ج.م</span>
                      </span>
                      <span className="w-6 h-6 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center text-xs font-bold group-hover:bg-primary-600 group-hover:text-white transition-all">
                        +
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right: Checkout Cart Panel */}
        <aside className="w-96 bg-surface-900 flex flex-col justify-between z-10 shadow-2xl">
          {/* Cart Header */}
          <div className="p-4 border-b border-surface-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-surface-100 flex items-center gap-2">
                <span>🛒 سلة المشتريات</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-600/20 text-primary-400 border border-primary-500/30">
                  {getItemsCount()} صنف
                </span>
              </h2>
            </div>

            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-danger-400 hover:text-danger-300 transition-colors p-1"
                title="تفريغ السلة"
              >
                مسح السلة
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-surface-500">
                <span className="text-4xl mb-3 opacity-40">🛒</span>
                <p className="text-sm font-medium text-surface-400">السلة فارغة حالياً</p>
                <p className="text-xs text-surface-500 mt-1">
                  امسح باركود المنتج أو اضغط على أحد المنتجات للإضافة
                </p>
              </div>
            ) : (
              items.map((item: CartItem) => {
                const lineTotalEgp = (item.total / 100).toFixed(2);
                const unitPriceEgp = (item.unitPrice / 100).toFixed(2);

                return (
                  <div
                    key={item.productId}
                    className="p-3 rounded-xl bg-surface-950/70 border border-surface-800/80 flex flex-col gap-2 hover:border-surface-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1 pe-2">
                        <h5 className="text-xs font-bold text-surface-200 truncate">
                          {item.productNameAr || item.productName}
                        </h5>
                        <span className="text-[11px] text-surface-400">
                          {unitPriceEgp} ج.م للقطعة
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-primary-400">{lineTotalEgp} ج.م</span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center justify-between pt-1 border-t border-surface-800/60">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 flex items-center justify-center font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-surface-100 font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 flex items-center justify-center font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-surface-500 hover:text-danger-400 text-xs p-1"
                        title="حذف الصنف"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Totals & Checkout */}
          <div className="p-4 border-t border-surface-800 bg-surface-950/90 space-y-3">
            <div className="space-y-1.5 text-xs text-surface-400">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-semibold text-surface-200">{(getSubtotal() / 100).toFixed(2)} ج.م</span>
              </div>
              {getTotalDiscount() > 0 && (
                <div className="flex justify-between text-danger-400">
                  <span>الخصم المطبق:</span>
                  <span className="font-semibold">-{(getTotalDiscount() / 100).toFixed(2)} ج.م</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>ضريبة القيمة المضافة (14%):</span>
                <span className="font-semibold text-surface-200">{(getTotalTax() / 100).toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-lg font-extrabold text-surface-100 pt-2 border-t border-surface-800">
                <span>الإجمالي الكلي:</span>
                <span className="text-primary-400 font-mono">{(getTotalAmount() / 100).toFixed(2)} ج.م</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => setIsPaymentOpen(true)}
                disabled={items.length === 0}
                className="btn-primary w-full py-3.5 text-base font-bold shadow-xl shadow-primary-600/30 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <span>💰</span>
                <span>إتمام الدفع (F9)</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={holdCart}
                  disabled={items.length === 0}
                  className="flex-1 py-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  ⏸️ تعليق (F7)
                </button>
                <button
                  onClick={() => setIsHeldOpen(true)}
                  className="flex-1 py-2 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  📋 المعلق ({heldCarts.length})
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={(sale) => {
          setIsPaymentOpen(false);
          setCompletedSale(sale);
        }}
      />

      {/* Completed Sale Receipt Modal */}
      <ReceiptModal
        sale={completedSale}
        onClose={() => {
          setCompletedSale(null);
          searchInputRef.current?.focus();
        }}
      />

      {/* Held Orders Modal */}
      <HeldOrdersModal
        isOpen={isHeldOpen}
        onClose={() => setIsHeldOpen(false)}
      />

      {/* Refund Modal */}
      <RefundModal
        isOpen={isRefundOpen}
        onClose={() => setIsRefundOpen(false)}
        onSuccess={(refund) => {
          alert(`تم تسجيل المرتجع بنجاح!\nرقم الإيصال: ${refund.refundNumber}\nالمبلغ المسترد: ${(refund.totalAmount / 100).toFixed(2)} ج.م`);
        }}
      />

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        onSuccess={(exp) => {
          alert(`تم تسجيل المصروف بنجاح!\nالمبلغ: ${(exp.amount / 100).toFixed(2)} ج.م\nالبيان: ${exp.description}`);
        }}
      />

      {/* Shift & Cash Session Modal */}
      <ShiftModal
        isOpen={isShiftOpen}
        onClose={() => setIsShiftOpen(false)}
        onShiftChanged={() => {
          // Re-fetch or refresh session info
        }}
      />
    </div>
  );
}
