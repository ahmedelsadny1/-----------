import React, { useState } from 'react';
import { useCartStore } from '../../stores/cart.store.js';
import { useAuth } from '../../hooks/useAuth.js';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (completedSale: any) => void;
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { items, customer, orderDiscountAmount, getTotalAmount, clearCart } = useCartStore();
  const { user } = useAuth();

  const totalAmount = getTotalAmount(); // in piasters
  const totalInEgp = totalAmount / 100;

  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT'>('CASH');
  const [tenderedEgp, setTenderedEgp] = useState<string>(totalInEgp.toFixed(2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const tenderedAmountPiasters = Math.round(parseFloat(tenderedEgp || '0') * 100);
  const changePiasters = Math.max(0, tenderedAmountPiasters - totalAmount);
  const changeInEgp = (changePiasters / 100).toFixed(2);
  const isInsufficient = tenderedAmountPiasters < totalAmount && paymentMethod === 'CASH';

  const handleQuickAdd = (additionalEgp: number) => {
    const current = parseFloat(tenderedEgp || '0');
    setTenderedEgp((current + additionalEgp).toFixed(2));
  };

  const handleExact = () => {
    setTenderedEgp(totalInEgp.toFixed(2));
  };

  const handleCompleteSale = async () => {
    if (isInsufficient) {
      setError('المبلغ المدفوع أقل من إجمالي الفاتورة');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payments = [
        {
          paymentMethod,
          amount: paymentMethod === 'CASH' ? tenderedAmountPiasters : totalAmount,
        },
      ];

      const salePayload = {
        terminalId: '01H0000000000000000000TERM',
        cashierId: user?.id || '01H00000000000000000CASHIE',
        customerId: customer?.id || null,
        items: items.map((i) => ({
          productId: i.productId,
          barcode: i.barcode,
          productName: i.productName,
          productNameAr: i.productNameAr,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          discountAmount: i.discountAmount,
          taxRateBasisPoints: i.taxRateBasisPoints,
        })),
        payments,
        orderDiscountAmount,
      };

      const result = await (window as any).api?.sales?.create(salePayload);

      if (result && result.success) {
        clearCart();
        onSuccess(result.data);
      } else {
        setError(result?.error || 'فشلت معالجة الفاتورة');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ الفاتورة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none p-4">
      <div className="bg-surface-900 border border-surface-700/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-surface-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-surface-100">إتمام عملية الدفع</h3>
            <p className="text-xs text-surface-400 mt-0.5">اختر وسيلة الدفع وأدخل المبلغ المستلم</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-danger-500/15 border border-danger-500/30 rounded-lg text-danger-300 text-sm flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Amount Due Display */}
          <div className="p-4 rounded-xl bg-surface-950 border border-surface-800/80 text-center">
            <span className="text-xs text-surface-400 font-medium">المبلغ الإجمالي المطلوب</span>
            <div className="text-3xl font-extrabold text-primary-400 mt-1">
              {totalInEgp.toFixed(2)} <span className="text-lg font-normal text-surface-400">ج.م</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-surface-300 mb-2">طريقة الدفع</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-primary-600/20 border-primary-500 text-primary-300 shadow-md shadow-primary-900/30'
                    : 'bg-surface-800/60 border-surface-700/60 text-surface-400 hover:bg-surface-800'
                }`}
              >
                <span>💵</span>
                <span>نقدي (كاش)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'CARD'
                    ? 'bg-primary-600/20 border-primary-500 text-primary-300 shadow-md shadow-primary-900/30'
                    : 'bg-surface-800/60 border-surface-700/60 text-surface-400 hover:bg-surface-800'
                }`}
              >
                <span>💳</span>
                <span>بطاقة بنكية</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('SPLIT')}
                className={`py-2.5 px-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  paymentMethod === 'SPLIT'
                    ? 'bg-primary-600/20 border-primary-500 text-primary-300 shadow-md shadow-primary-900/30'
                    : 'bg-surface-800/60 border-surface-700/60 text-surface-400 hover:bg-surface-800'
                }`}
              >
                <span>🔄</span>
                <span>دفع مجزأ</span>
              </button>
            </div>
          </div>

          {/* Cash Details */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  المبلغ المستلم من العميل
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={tenderedEgp}
                    onChange={(e) => setTenderedEgp(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-950 border border-surface-700 rounded-xl text-xl font-bold text-surface-100 text-left focus:outline-none focus:border-primary-500"
                    placeholder="0.00"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-surface-400">ج.م</span>
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExact}
                  className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs text-surface-200 border border-surface-700 transition-colors font-medium"
                >
                  المبلغ الدقيق
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(50)}
                  className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs text-surface-200 border border-surface-700 transition-colors font-medium"
                >
                  +50 ج.م
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(100)}
                  className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs text-surface-200 border border-surface-700 transition-colors font-medium"
                >
                  +100 ج.م
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdd(200)}
                  className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-xs text-surface-200 border border-surface-700 transition-colors font-medium"
                >
                  +200 ج.م
                </button>
              </div>

              {/* Change calculation */}
              <div className="p-3.5 rounded-xl bg-surface-950/80 border border-surface-800 flex items-center justify-between">
                <span className="text-sm text-surface-300 font-medium">المتبقي للعميل (الباقي):</span>
                <span className="text-xl font-bold text-emerald-400">{changeInEgp} ج.م</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-surface-800 bg-surface-950/40 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-surface-800 hover:bg-surface-700 text-surface-300 rounded-xl font-medium transition-colors text-sm"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleCompleteSale}
            disabled={isSubmitting || (paymentMethod === 'CASH' && isInsufficient)}
            className="flex-[2] py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all text-sm shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>✓ تأكيد وطباعة الفاتورة</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
