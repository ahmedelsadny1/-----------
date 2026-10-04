import React from 'react';

interface ReceiptModalProps {
  sale: any | null;
  onClose: () => void;
}

export function ReceiptModal({ sale, onClose }: ReceiptModalProps) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-surface-900 border border-surface-700/60 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
        {/* Modal Controls */}
        <div className="p-4 border-b border-surface-800 flex items-center justify-between bg-surface-950/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-surface-200">معاينة الإيصال</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Printable Thermal Receipt Paper */}
        <div className="flex-1 overflow-y-auto p-6 bg-white text-black font-mono text-xs shadow-inner">
          <div className="text-center space-y-1 mb-4 border-b pb-3 border-dashed border-gray-400">
            <h2 className="text-base font-bold tracking-tight">سوبرماركت الأمل</h2>
            <p className="text-[11px] text-gray-600">Al-Amal Supermarket — Main Branch</p>
            <p className="text-[10px] text-gray-500">123 Nile Corniche, Cairo</p>
            <p className="text-[10px] text-gray-500">رقم ضريبي: 123-456-789</p>
          </div>

          <div className="space-y-1 text-[11px] mb-3 pb-2 border-b border-dashed border-gray-400">
            <div className="flex justify-between">
              <span>رقم الفاتورة:</span>
              <span className="font-bold">{sale.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>التاريخ:</span>
              <span>{new Date(sale.createdAt || Date.now()).toLocaleString('ar-EG')}</span>
            </div>
            <div className="flex justify-between">
              <span>الكاشير:</span>
              <span>أحمد محمود</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-4">
            <div className="flex justify-between font-bold border-b border-gray-300 pb-1 mb-1 text-[10px]">
              <span>الصنف</span>
              <span className="w-10 text-center">الكمية</span>
              <span className="w-14 text-left">السعر</span>
              <span className="w-14 text-left">الإجمالي</span>
            </div>

            <div className="space-y-1.5 py-1">
              {sale.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span className="flex-1 truncate pe-1 font-sans">{item.productNameAr || item.productName}</span>
                  <span className="w-10 text-center">x{item.quantity}</span>
                  <span className="w-14 text-left">{(item.unitPrice / 100).toFixed(2)}</span>
                  <span className="w-14 text-left font-bold">{(item.totalPrice / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 pt-2 border-t border-dashed border-gray-400 text-[11px]">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span>{(sale.subtotal / 100).toFixed(2)} ج.م</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>الخصم:</span>
                <span>-{(sale.discountAmount / 100).toFixed(2)} ج.م</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>ضريبة القيمة المضافة (14%):</span>
              <span>{(sale.taxAmount / 100).toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-gray-300">
              <span>الإجمالي الكلي:</span>
              <span>{(sale.totalAmount / 100).toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between pt-1 text-[10px] text-gray-600">
              <span>المدفوع:</span>
              <span>{(sale.paidAmount / 100).toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-green-700">
              <span>المتبقي (الباقي):</span>
              <span>{(sale.changeAmount / 100).toFixed(2)} ج.م</span>
            </div>
          </div>

          {/* Barcode representation */}
          <div className="text-center mt-6 pt-3 border-t border-dashed border-gray-400">
            <div className="text-[10px] tracking-widest font-mono font-bold mb-1">
              ||||| | |||| ||||| ||| |||||||
            </div>
            <p className="text-[10px] text-gray-500">شكراً لزيارتكم • نتمنى لكم يوماً سعيداً</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-surface-950 border-t border-surface-800 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-surface-800 hover:bg-surface-700 text-surface-300 text-xs font-semibold transition-colors"
          >
            إغلاق
          </button>
          <button
            onClick={handlePrint}
            className="flex-[2] py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition-all shadow-md shadow-primary-600/30 flex items-center justify-center gap-2"
          >
            <span>🖨️</span>
            <span>طباعة الإيصال الحراري</span>
          </button>
        </div>
      </div>
    </div>
  );
}
