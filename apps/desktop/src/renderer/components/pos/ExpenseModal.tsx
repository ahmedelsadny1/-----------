import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (expense: any) => void;
}

export function ExpenseModal({ isOpen, onClose, onSuccess }: ExpenseModalProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<{ id: string; nameAr: string }[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (window.api?.expenses?.categories) {
        window.api.expenses.categories().then((res: any) => {
          if (res?.success && res.data) {
            setCategories(res.data);
            if (res.data.length > 0) {
              setCategoryId(res.data[0].id);
            }
          }
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountEgp = parseFloat(amountStr);
    if (isNaN(amountEgp) || amountEgp <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    const piasters = Math.round(amountEgp * 100);

    setSubmitting(true);
    try {
      if (window.api?.expenses?.create) {
        const res = (await window.api.expenses.create({
          categoryId,
          amount: piasters,
          description,
          recipient: recipient || undefined,
          receiptNumber: receiptNumber || undefined,
          createdBy: user?.id || 'cashier_local',
        })) as any;

        if (res?.success) {
          onSuccess(res.data);
          onClose();
          setAmountStr('');
          setDescription('');
          setRecipient('');
          setReceiptNumber('');
        } else {
          alert('فشل تسجيل المصروف: ' + (res?.error || 'خطأ'));
        }
      }
    } catch (err: any) {
      alert('خطأ أثناء حفظ المصروف: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-xl">
              💸
            </div>
            <div>
              <h3 className="text-lg font-black text-surface-100">تسجيل مصروف نثري من الدرج</h3>
              <p className="text-xs text-surface-400">خصم مصروف نقدي وربطه بوردية الكاشير</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-800 hover:bg-surface-700 text-surface-400 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-surface-300 mb-1.5">بند المصروف</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2.5 text-sm text-surface-100 focus:outline-none focus:border-rose-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-300 mb-1.5">المبلغ بالجنيه المصري (ج.م)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              required
              autoFocus
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2.5 text-base font-bold text-rose-400 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-300 mb-1.5">بيان المصروف والسبب</label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: شراء مأكولات وشاي للوردية، مستلزمات نظافة..."
              className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 text-xs text-surface-100 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-300 mb-1.5">المستلم (اختياري)</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="اسم المستلم"
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-300 mb-1.5">رقم الإيصال / الفاتورة</label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="رقم المستند"
                className="w-full bg-surface-950 border border-surface-800 rounded-xl px-3 py-2 text-xs text-surface-100 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-sm font-medium transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-rose-600/30 transition-all"
            >
              {submitting ? 'جاري الصرف...' : 'صرف المبلغ من الدرج'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
