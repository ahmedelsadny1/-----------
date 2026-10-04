import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (refundResult: any) => void;
}

export function RefundModal({ isOpen, onClose, onSuccess }: RefundModalProps) {
  const { user } = useAuth();
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Return item selection: map of saleItemId -> quantity to return
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('إرجاع بمعرفة العميل');
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSearchInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceQuery.trim()) return;

    setLoadingInvoice(true);
    setErrorMsg(null);
    setInvoiceData(null);
    setReturnQtys({});

    try {
      if (window.api?.sales?.getByInvoice) {
        const res = (await window.api.sales.getByInvoice(invoiceQuery.trim())) as any;
        if (res?.success && res.data) {
          setInvoiceData(res.data);
          // Initialize return quantities to 0
          const initial: Record<string, number> = {};
          res.data.items?.forEach((item: any) => {
            initial[item.id] = 0;
          });
          setReturnQtys(initial);
        } else {
          setErrorMsg('لم يتم العثور على فاتورة بهذا الرقم');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء البحث عن الفاتورة');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleQtyChange = (itemId: string, maxQty: number, val: number) => {
    const clamped = Math.max(0, Math.min(maxQty, val));
    setReturnQtys((prev) => ({
      ...prev,
      [itemId]: clamped,
    }));
  };

  // Calculate refund total
  let refundTotal = 0;
  if (invoiceData?.items) {
    invoiceData.items.forEach((item: any) => {
      const q = returnQtys[item.id] || 0;
      refundTotal += q * item.unit_price;
    });
  }

  const handleProcessRefund = async () => {
    if (refundTotal <= 0) {
      alert('يرجى تحديد كمية صنف واحد على الأقل للمرتجع');
      return;
    }

    const itemsToRefund = invoiceData.items
      .filter((item: any) => (returnQtys[item.id] || 0) > 0)
      .map((item: any) => ({
        saleItemId: item.id,
        productId: item.product_id,
        quantity: returnQtys[item.id],
        unitPrice: item.unit_price,
        totalPrice: returnQtys[item.id] * item.unit_price,
        reason,
      }));

    setProcessing(true);
    try {
      if (window.api?.sales?.refund) {
        const res = (await window.api.sales.refund({
          originalSaleId: invoiceData.id,
          cashierId: user?.id || 'cashier_local',
          reason,
          items: itemsToRefund,
        })) as any;

        if (res?.success) {
          onSuccess(res.data);
          onClose();
        } else {
          alert('فشل استرداد الفاتورة: ' + (res?.error || 'خطأ غير معروف'));
        }
      }
    } catch (err: any) {
      alert('خطأ أثناء المعالجة: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (piasters: number) => {
    return (piasters / 100).toLocaleString('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ج.م';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
              ↩️
            </div>
            <div>
              <h2 className="text-lg font-black text-surface-100">استرجاع أصناف / مرتجع فاتورة</h2>
              <p className="text-xs text-surface-400">إرجاع بضاعة وإعادة الرصيد للمخزون واسترداد النقدية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-800 hover:bg-surface-700 text-surface-400 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Lookup Form */}
          <form onSubmit={handleSearchInvoice} className="flex gap-3">
            <input
              type="text"
              autoFocus
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder="امسح أو اكتب رقم الفاتورة (مثال: INV-202610...)"
              className="flex-1 bg-surface-950 border border-surface-800 rounded-2xl px-4 py-3 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
            />
            <button
              type="submit"
              disabled={loadingInvoice}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-surface-950 font-bold text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20"
            >
              {loadingInvoice ? 'جاري البحث...' : 'بحث عن الفاتورة 🔍'}
            </button>
          </form>

          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs text-center font-medium">
              {errorMsg}
            </div>
          )}

          {/* Invoice Details & Item Selection */}
          {invoiceData && (
            <div className="space-y-4">
              <div className="p-4 bg-surface-950/60 rounded-2xl border border-surface-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-surface-400">رقم الفاتورة:</span>{' '}
                  <span className="font-mono font-bold text-surface-100">{invoiceData.invoice_number}</span>
                </div>
                <div>
                  <span className="text-surface-400">التاريخ:</span>{' '}
                  <span className="text-surface-200">
                    {new Date(invoiceData.created_at).toLocaleString('ar-EG')}
                  </span>
                </div>
                <div>
                  <span className="text-surface-400">الحالة:</span>{' '}
                  <span className="text-emerald-400 font-bold">{invoiceData.status}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-surface-800 rounded-2xl overflow-hidden bg-surface-950/40">
                <table className="w-full text-right text-xs">
                  <thead className="bg-surface-800/40 text-surface-400">
                    <tr>
                      <th className="p-3">الصنف</th>
                      <th className="p-3 text-center">الكمية المباعة</th>
                      <th className="p-3 text-center">سعر الوحدة</th>
                      <th className="p-3 text-center">الكمية المرتجعة</th>
                      <th className="p-3 text-left">مجموع المرتجع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/40">
                    {invoiceData.items?.map((item: any) => {
                      const curQty = returnQtys[item.id] || 0;
                      return (
                        <tr key={item.id} className="hover:bg-surface-800/20">
                          <td className="p-3 font-medium text-surface-200">{item.product_name}</td>
                          <td className="p-3 text-center font-mono font-bold text-surface-400">
                            {item.quantity}
                          </td>
                          <td className="p-3 text-center font-mono text-surface-400">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1 bg-surface-900 border border-surface-700 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.id, item.quantity, curQty - 1)}
                                className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-surface-200 flex items-center justify-center font-bold"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-surface-100">
                                {curQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQtyChange(item.id, item.quantity, curQty + 1)}
                                className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 text-surface-200 flex items-center justify-center font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-left font-mono font-bold text-amber-400">
                            {formatCurrency(curQty * item.unit_price)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">سبب الإرجاع</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2.5 text-xs text-surface-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="إرجاع بمعرفة العميل">إرجاع بمعرفة العميل</option>
                  <option value="صنف تالف أو منتهي الصلاحية">صنف تالف أو منتهي الصلاحية</option>
                  <option value="خطأ في تسجيل الفاتورة">خطأ في تسجيل الفاتورة</option>
                  <option value="طلب استبدال أو استرداد نقدي">طلب استبدال أو استرداد نقدي</option>
                </select>
              </div>

              {/* Total Refund Summary */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
                <span className="text-sm font-bold text-surface-200">إجمالي المبلغ المسترد للعميل:</span>
                <span className="text-xl font-black text-amber-400 font-mono">{formatCurrency(refundTotal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-800 flex justify-end gap-3 bg-surface-950/40">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-sm font-medium transition-colors"
          >
            إلغاء
          </button>
          {invoiceData && (
            <button
              onClick={handleProcessRefund}
              disabled={processing || refundTotal <= 0}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-surface-950 text-sm font-bold shadow-lg shadow-amber-500/20 transition-all"
            >
              {processing ? 'جاري المعالجة...' : 'تأكيد المرتجع واسترداد النقدية'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
