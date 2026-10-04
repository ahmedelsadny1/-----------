import React from 'react';
import { useCartStore, HeldCart } from '../../stores/cart.store.js';

interface HeldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HeldOrdersModal({ isOpen, onClose }: HeldOrdersModalProps) {
  const { heldCarts, resumeCart, deleteHeldCart } = useCartStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-surface-900 border border-surface-700/60 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-surface-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏸️</span>
            <div>
              <h3 className="text-base font-bold text-surface-100">الفواتير المعلقة (Held Orders)</h3>
              <p className="text-xs text-surface-400">استعادة أو حذف الطلبات المعلقة في الانتظار</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {heldCarts.length === 0 ? (
            <div className="p-12 text-center text-surface-500">
              <span className="text-4xl block mb-2 opacity-40">📭</span>
              <p className="text-sm font-medium">لا توجد طلبات معلقة حالياً</p>
            </div>
          ) : (
            heldCarts.map((order: HeldCart) => (
              <div
                key={order.id}
                className="p-4 rounded-xl bg-surface-800/40 border border-surface-700/60 hover:border-surface-600 transition-all flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary-400">{order.id}</span>
                    <span className="text-[11px] text-surface-500">• {order.date}</span>
                  </div>
                  <p className="text-sm font-medium text-surface-200 mt-1">
                    {order.customer?.name || 'عميل نقدي عام'}
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {order.items.length} أصناف • إجمالي: {(order.total / 100).toFixed(2)} ج.م
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      resumeCart(order.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    استرجاع
                  </button>
                  <button
                    onClick={() => deleteHeldCart(order.id)}
                    className="p-1.5 text-surface-400 hover:text-danger-400 hover:bg-surface-700 rounded-lg transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface-950 border-t border-surface-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
