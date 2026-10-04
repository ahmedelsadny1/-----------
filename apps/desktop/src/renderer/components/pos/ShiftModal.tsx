import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.js';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftChanged: () => void;
}

export function ShiftModal({ isOpen, onClose, onShiftChanged }: ShiftModalProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Open Shift Form
  const [openingCashStr, setOpeningCashStr] = useState('500');

  // Close Shift Form
  const [countedCashStr, setCountedCashStr] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSession = async () => {
    setLoading(true);
    try {
      if (window.api?.cashSessions?.getCurrent) {
        const res = (await window.api.cashSessions.getCurrent()) as any;
        if (res?.success) {
          setSession(res.data);
          if (res.data) {
            setCountedCashStr(((res.data.systemCalculatedCash || res.data.openingBalance) / 100).toFixed(2));
          }
        } else {
          setSession(null);
        }
      }
    } catch (err) {
      console.error('Failed to load active shift:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSession();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const cashEgp = parseFloat(openingCashStr);
    if (isNaN(cashEgp) || cashEgp < 0) {
      alert('يرجى إدخال مبلغ عهدة بداية صحيح');
      return;
    }

    setSubmitting(true);
    try {
      if (window.api?.cashSessions?.open) {
        const res = (await window.api.cashSessions.open(Math.round(cashEgp * 100))) as any;
        if (res?.success) {
          alert('تم فتح الوردية بنجاح!');
          onShiftChanged();
          fetchSession();
        } else {
          alert('فشل فتح الوردية: ' + (res?.error || 'خطأ'));
        }
      }
    } catch (err: any) {
      alert('خطأ: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const countedEgp = parseFloat(countedCashStr);
    if (isNaN(countedEgp) || countedEgp < 0) {
      alert('يرجى إدخال المبلغ الفعلي المعدود في الدرج');
      return;
    }

    const countedPiasters = Math.round(countedEgp * 100);

    if (!confirm('هل أنت متأكد من رغبتك في تقفيل الوردية وإصدار تقرير الترحيل Z-Report؟ لن تتمكن من تعديل هذه الوردية بعد الإغلاق.')) {
      return;
    }

    setSubmitting(true);
    try {
      if (window.api?.cashSessions?.close) {
        const res = (await window.api.cashSessions.close({
          sessionId: session.id,
          countedCash: countedPiasters,
          notes,
        })) as any;

        if (res?.success) {
          const disc = res.data.discrepancy / 100;
          let discMsg = 'متطابق تماماً بدون عجز أو زيادة!';
          if (disc < 0) discMsg = `يوجد عجز في الدرج بمقدار: ${Math.abs(disc).toFixed(2)} ج.م`;
          if (disc > 0) discMsg = `يوجد زيادة في الدرج بمقدار: ${disc.toFixed(2)} ج.م`;

          alert(`تم إغلاق الوردية بنجاح!\n${discMsg}`);
          onShiftChanged();
          onClose();
        } else {
          alert('فشل إغلاق الوردية: ' + (res?.error || 'خطأ'));
        }
      }
    } catch (err: any) {
      alert('خطأ أثناء تقفيل الوردية: ' + err.message);
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

  const countedPiasters = Math.round((parseFloat(countedCashStr) || 0) * 100);
  const expectedPiasters = session?.systemCalculatedCash || session?.openingBalance || 0;
  const currentDiscrepancy = countedPiasters - expectedPiasters;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center text-xl">
              ⏱️
            </div>
            <div>
              <h3 className="text-lg font-black text-surface-100">إدارة وردية الكاشير والدرج</h3>
              <p className="text-xs text-surface-400">بدء وإغلاق نوبات العمل وجرد النقدية (Z-Report)</p>
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
        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-surface-400 text-sm">جاري قراءة حالة الدرج...</div>
          ) : !session || session.status === 'CLOSED' ? (
            /* Open Shift Screen */
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300">
                ⚠️ لا توجد وردية مفتوحة حالياً على هذا الجهاز. يرجى إدخال مبلغ العهدة الافتتاحية في الدرج لبدء
                تسجيل الفواتير.
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  رصيد العهدة النقدية في الدرج (الفكة الافتتاحية) بالجنيه
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  autoFocus
                  value={openingCashStr}
                  onChange={(e) => setOpeningCashStr(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2.5 text-lg font-bold text-surface-100 focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div className="pt-3 flex gap-3">
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
                  className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-primary-600/30 transition-all"
                >
                  {submitting ? 'جاري الفتح...' : 'بدء الوردية والعمل 🚀'}
                </button>
              </div>
            </form>
          ) : (
            /* Active Shift & Close Form */
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="p-4 bg-surface-950/80 border border-surface-800 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-surface-400">رقم الوردية:</span>
                  <span className="font-mono font-bold text-surface-100">{session.sessionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">وقت البدء:</span>
                  <span className="text-surface-200">
                    {new Date(session.openingTime).toLocaleTimeString('ar-EG')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">عهدة بداية الدرج:</span>
                  <span className="font-mono font-bold text-surface-100">
                    {formatCurrency(session.openingBalance)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-surface-800">
                  <span className="text-surface-300 font-semibold">الرصيد المحسوب بالسيستم:</span>
                  <span className="font-mono font-bold text-primary-400 text-sm">
                    {formatCurrency(expectedPiasters)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">
                  المبلغ الفعلي في الدرج بعد العد اليدوي (ج.م)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  autoFocus
                  value={countedCashStr}
                  onChange={(e) => setCountedCashStr(e.target.value)}
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2.5 text-lg font-bold text-surface-100 focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              {/* Real-time Discrepancy Alert */}
              <div
                className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                  currentDiscrepancy === 0
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : currentDiscrepancy < 0
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold'
                    : 'bg-primary-500/10 border-primary-500/20 text-primary-400 font-bold'
                }`}
              >
                <span>
                  {currentDiscrepancy === 0
                    ? 'العد متطابق تماماً مع السيستم ✓'
                    : currentDiscrepancy < 0
                    ? 'عجز في النقدية ⚠️'
                    : 'فائض زيادة في النقدية ℹ️'}
                </span>
                <span className="font-mono text-sm">{formatCurrency(Math.abs(currentDiscrepancy))}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-300 mb-1.5">ملاحظات التقفيل (اختياري)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="سبب أي عجز أو ملاحظات تسليم للمشرف..."
                  className="w-full bg-surface-950 border border-surface-800 rounded-xl px-4 py-2 text-xs text-surface-100 focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-sm font-medium transition-colors"
                >
                  رجوع للبيع
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-rose-600/30 transition-all"
                >
                  {submitting ? 'جاري التقفيل...' : 'تقفيل الوردية (Z-Report)'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
