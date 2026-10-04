import { create } from 'zustand';

export interface CartItem {
  productId: string;
  barcode?: string;
  productName: string;
  productNameAr?: string;
  unitPrice: number; // in piasters
  quantity: number;
  discountAmount: number; // in piasters
  discountPercent: number; // basis points
  taxRateBasisPoints: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  loyaltyPoints?: number;
}

export interface HeldCart {
  id: string;
  date: string;
  items: CartItem[];
  customer?: Customer | null;
  total: number;
}

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  orderDiscountAmount: number; // in piasters
  orderDiscountType: 'FIXED' | 'PERCENTAGE';
  heldCarts: HeldCart[];

  addItem: (product: any, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setLineDiscount: (productId: string, discountAmount: number) => void;
  setOrderDiscount: (amount: number, type?: 'FIXED' | 'PERCENTAGE') => void;
  setCustomer: (customer: Customer | null) => void;
  clearCart: () => void;
  holdCart: () => void;
  resumeCart: (heldId: string) => void;
  deleteHeldCart: (heldId: string) => void;

  // Calculations
  getSubtotal: () => number;
  getTotalTax: () => number;
  getTotalDiscount: () => number;
  getTotalAmount: () => number;
  getItemsCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  orderDiscountAmount: 0,
  orderDiscountType: 'FIXED',
  heldCarts: [],

  addItem: (product: any, quantity = 1) => {
    const { items } = get();
    const existingIndex = items.findIndex((i) => i.productId === product.id);

    const price = product.sellingPrice || product.selling_price || 0;
    const taxRate = product.taxRateBasisPoints || product.tax_rate_basis_points || 0;

    if (existingIndex >= 0) {
      const newItems = [...items];
      const current = newItems[existingIndex];
      const newQty = current.quantity + quantity;

      const lineBase = price * newQty;
      const afterDiscount = Math.max(0, lineBase - current.discountAmount);
      const tax = Math.round((afterDiscount * taxRate) / 10000);

      newItems[existingIndex] = {
        ...current,
        quantity: newQty,
        subtotal: afterDiscount,
        taxAmount: tax,
        total: afterDiscount + tax,
      };

      set({ items: newItems });
    } else {
      const lineBase = price * quantity;
      const tax = Math.round((lineBase * taxRate) / 10000);

      const newItem: CartItem = {
        productId: product.id,
        barcode: product.barcode,
        productName: product.name,
        productNameAr: product.nameAr || product.name_ar,
        unitPrice: price,
        quantity,
        discountAmount: 0,
        discountPercent: 0,
        taxRateBasisPoints: taxRate,
        subtotal: lineBase,
        taxAmount: tax,
        total: lineBase + tax,
      };

      set({ items: [...items, newItem] });
    }
  },

  removeItem: (productId: string) => {
    set({ items: get().items.filter((i) => i.productId !== productId) });
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    const newItems = get().items.map((item) => {
      if (item.productId === productId) {
        const lineBase = item.unitPrice * quantity;
        const afterDiscount = Math.max(0, lineBase - item.discountAmount);
        const tax = Math.round((afterDiscount * item.taxRateBasisPoints) / 10000);
        return {
          ...item,
          quantity,
          subtotal: afterDiscount,
          taxAmount: tax,
          total: afterDiscount + tax,
        };
      }
      return item;
    });

    set({ items: newItems });
  },

  setLineDiscount: (productId: string, discountAmount: number) => {
    const newItems = get().items.map((item) => {
      if (item.productId === productId) {
        const lineBase = item.unitPrice * item.quantity;
        const disc = Math.min(lineBase, Math.max(0, discountAmount));
        const afterDiscount = lineBase - disc;
        const tax = Math.round((afterDiscount * item.taxRateBasisPoints) / 10000);
        return {
          ...item,
          discountAmount: disc,
          subtotal: afterDiscount,
          taxAmount: tax,
          total: afterDiscount + tax,
        };
      }
      return item;
    });

    set({ items: newItems });
  },

  setOrderDiscount: (amount: number, type = 'FIXED') => {
    set({ orderDiscountAmount: Math.max(0, amount), orderDiscountType: type });
  },

  setCustomer: (customer: Customer | null) => {
    set({ customer });
  },

  clearCart: () => {
    set({ items: [], customer: null, orderDiscountAmount: 0 });
  },

  holdCart: () => {
    const { items, customer, heldCarts, getTotalAmount } = get();
    if (items.length === 0) return;

    const newHeld: HeldCart = {
      id: `HOLD-${Date.now()}`,
      date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      items: [...items],
      customer,
      total: getTotalAmount(),
    };

    set({
      heldCarts: [...heldCarts, newHeld],
      items: [],
      customer: null,
      orderDiscountAmount: 0,
    });
  },

  resumeCart: (heldId: string) => {
    const { heldCarts } = get();
    const target = heldCarts.find((h) => h.id === heldId);
    if (!target) return;

    set({
      items: target.items,
      customer: target.customer || null,
      heldCarts: heldCarts.filter((h) => h.id !== heldId),
    });
  },

  deleteHeldCart: (heldId: string) => {
    set({ heldCarts: get().heldCarts.filter((h) => h.id !== heldId) });
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getTotalTax: () => {
    return get().items.reduce((sum, item) => sum + item.taxAmount, 0);
  },

  getTotalDiscount: () => {
    const lineDiscounts = get().items.reduce((sum, item) => sum + item.discountAmount, 0);
    return lineDiscounts + get().orderDiscountAmount;
  },

  getTotalAmount: () => {
    const sub = get().getSubtotal();
    const orderDisc = get().orderDiscountAmount;
    const tax = get().getTotalTax();
    return Math.max(0, sub - orderDisc + tax);
  },

  getItemsCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
