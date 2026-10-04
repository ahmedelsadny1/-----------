// ============================================
// @supermarket/shared - Types
// ============================================
// Shared type definitions used across desktop, backend, and admin-web.

// ---- Base Entity ----

export interface BaseEntity {
  id: string; // ULID
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface SyncableEntity extends BaseEntity {
  version: number;
  deletedAt?: string | null;
  syncStatus?: SyncStatus;
}

// ---- Company ----

export interface Company extends BaseEntity {
  name: string;
  nameAr?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  currencyCode: string;
  currencySubunit: number; // e.g., 100 for EGP (piasters)
  isActive: boolean;
}

// ---- Branch ----

export interface Branch extends BaseEntity {
  companyId: string;
  name: string;
  nameAr?: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

// ---- User ----

export interface User extends BaseEntity {
  companyId: string;
  username: string;
  email?: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt?: string;
  offlineAccessEnabled: boolean;
}

export interface UserWithRoles extends User {
  roles: Role[];
  permissions: string[];
  branches: string[]; // branch IDs
}

// ---- Role ----

export interface Role extends BaseEntity {
  companyId?: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  module: string;
}

// ---- Device & Terminal ----

export interface Device extends BaseEntity {
  companyId: string;
  branchId: string;
  deviceName: string;
  appVersion?: string;
  dbVersion?: number;
  lastSeenAt?: string;
  lastSyncAt?: string;
  status: DeviceStatus;
}

export type DeviceStatus = 'ACTIVE' | 'INACTIVE' | 'REVOKED';

export interface PosTerminal extends BaseEntity {
  companyId: string;
  branchId: string;
  deviceId?: string;
  terminalCode: string;
  terminalName: string;
  isActive: boolean;
}

// ---- Product ----

export interface Product extends SyncableEntity {
  companyId: string;
  nameAr: string;
  nameEn?: string;
  sku?: string;
  categoryId?: string;
  brandId?: string;
  unitId?: string;
  costPrice: number; // integer, smallest currency unit
  sellingPrice: number; // integer, smallest currency unit
  wholesalePrice?: number;
  minPrice?: number;
  taxRateId?: string;
  productType: ProductType;
  minStock?: number;
  maxStock?: number;
  weight?: number;
  imageUrl?: string;
  description?: string;
  isActive: boolean;
}

export type ProductType = 'STANDARD' | 'WEIGHTED' | 'SERVICE' | 'VARIANT';

export interface ProductBarcode {
  id: string;
  productId: string;
  barcode: string;
  isPrimary: boolean;
  createdAt: string;
}

// ---- Category ----

export interface Category extends SyncableEntity {
  companyId: string;
  nameAr: string;
  nameEn?: string;
  parentId?: string;
  sortOrder: number;
  imageUrl?: string;
  isActive: boolean;
}

// ---- Brand ----

export interface Brand extends SyncableEntity {
  companyId: string;
  nameAr: string;
  nameEn?: string;
  isActive: boolean;
}

// ---- Unit ----

export interface Unit extends SyncableEntity {
  companyId: string;
  nameAr: string;
  nameEn?: string;
  abbreviation?: string;
  isActive: boolean;
}

// ---- Tax Rate ----

export interface TaxRate extends SyncableEntity {
  companyId: string;
  name: string;
  rate: number; // basis points (1% = 100)
  isInclusive: boolean;
  isActive: boolean;
}

// ---- Product Price ----

export interface ProductPrice extends SyncableEntity {
  productId: string;
  priceType: PriceType;
  amount: number; // integer, smallest currency unit
  branchId?: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
}

export type PriceType = 'RETAIL' | 'WHOLESALE' | 'PROMOTIONAL';

// ---- Inventory ----

export interface InventoryRecord {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  reserved: number;
  version: number;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  branchId: string;
  terminalId?: string;
  movementType: MovementType;
  quantity: number; // positive = in, negative = out
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  userId: string;
  createdAt: string;
  syncStatus?: SyncStatus;
}

export type MovementType =
  | 'SALE'
  | 'PURCHASE'
  | 'ADJUSTMENT'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'DAMAGE'
  | 'OPENING'
  | 'RETURN';

// ---- Customer ----

export interface Customer extends SyncableEntity {
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  loyaltyPoints: number;
  creditBalance: number; // integer, smallest currency unit
  isActive: boolean;
}

// ---- Sale ----

export interface Sale extends SyncableEntity {
  companyId: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  customerId?: string;
  invoiceNumber: string;
  subtotal: number; // integer
  discountAmount: number; // integer
  taxAmount: number; // integer
  totalAmount: number; // integer
  status: SaleStatus;
  notes?: string;
  idempotencyKey: string;
  serverId?: string;
}

export type SaleStatus =
  | 'COMPLETED'
  | 'HELD'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

// ---- Sale Item ----

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  barcode?: string;
  quantity: number;
  unitPrice: number; // integer
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount: number; // integer
  taxRate: number; // basis points
  taxAmount: number; // integer
  subtotal: number; // integer
  total: number; // integer
  createdAt: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

// ---- Payment ----

export interface Payment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number; // integer
  received?: number; // integer (for cash)
  changeAmount?: number; // integer (for cash)
  reference?: string;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'WALLET';

// ---- Refund ----

export interface Refund extends SyncableEntity {
  saleId: string;
  companyId: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  refundType: RefundType;
  totalAmount: number; // integer
  reason: string;
  idempotencyKey: string;
}

export type RefundType = 'FULL' | 'PARTIAL';

export interface RefundItem {
  id: string;
  refundId: string;
  saleItemId: string;
  productId: string;
  quantity: number;
  amount: number; // integer
  createdAt: string;
}

// ---- Cash Session ----

export interface CashSession extends SyncableEntity {
  companyId: string;
  branchId: string;
  terminalId: string;
  cashierId: string;
  openingAmount: number; // integer
  closingAmount?: number; // integer
  expectedAmount?: number; // integer
  difference?: number; // integer
  status: CashSessionStatus;
  openedAt: string;
  closedAt?: string;
  notes?: string;
}

export type CashSessionStatus = 'OPEN' | 'CLOSED';

// ---- Cash Movement ----

export interface CashMovement {
  id: string;
  sessionId: string;
  movementType: CashMovementType;
  amount: number; // integer (positive = in, negative = out)
  referenceType?: string;
  referenceId?: string;
  reason?: string;
  userId: string;
  createdAt: string;
  syncStatus?: SyncStatus;
}

export type CashMovementType = 'SALE' | 'REFUND' | 'DEPOSIT' | 'WITHDRAWAL' | 'EXPENSE';

// ---- Expense ----

export interface Expense extends SyncableEntity {
  companyId: string;
  branchId: string;
  category: string;
  amount: number; // integer
  paymentMethod: string;
  description?: string;
  userId: string;
  attachmentPath?: string;
}

// ---- Sync ----

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT' | 'CANCELLED';

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: string; // JSON
  idempotencyKey: string;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdAt: string;
  lastAttemptAt?: string;
  syncedAt?: string;
}

export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'UNSTABLE' | 'SERVER_UNAVAILABLE' | 'SYNCING';

// ---- Audit ----

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: string; // JSON
  newValue?: string; // JSON
  terminalId?: string;
  createdAt: string;
}

// ---- Cart (Runtime, not persisted in DB) ----

export interface CartItem {
  id: string; // temporary ID for cart management
  productId: string;
  productName: string;
  nameAr: string;
  barcode?: string;
  quantity: number;
  unitPrice: number; // integer
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount: number; // integer (calculated)
  taxRate: number; // basis points
  taxAmount: number; // integer (calculated)
  subtotal: number; // integer (calculated)
  total: number; // integer (calculated)
}

export interface Cart {
  items: CartItem[];
  customerId?: string;
  customerName?: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  invoiceDiscountType?: DiscountType;
  invoiceDiscountValue?: number;
}

// ---- Held Cart ----

export interface HeldCart {
  id: string;
  cashierId: string;
  terminalId: string;
  customerId?: string;
  label?: string;
  cartData: string; // JSON serialized Cart
  createdAt: string;
  updatedAt: string;
}

// ---- API Response ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

// ---- Query Parameters ----

export interface PaginationParams {
  page?: number;
  perPage?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

export interface DateRangeParams {
  from?: string;
  to?: string;
}

// ---- Settings ----

export interface LocalSettings {
  locale: 'ar' | 'en';
  direction: 'rtl' | 'ltr';
  currencyCode: string;
  currencySubunit: number;
  taxMode: 'INCLUSIVE' | 'EXCLUSIVE';
  negativeInventoryAllowed: boolean;
  receiptTemplate: ReceiptTemplate;
  syncIntervalSeconds: number;
  maxOfflineDays: number;
}

export interface ReceiptTemplate {
  storeName: string;
  storeNameAr?: string;
  branchName: string;
  address?: string;
  phone?: string;
  logoPath?: string;
  footerText?: string;
  showTaxDetails: boolean;
  showBarcode: boolean;
  paperWidth: number; // mm
}
