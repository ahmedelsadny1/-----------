// ============================================
// @supermarket/shared - Utilities
// ============================================

import { ulid } from 'ulid';

// ---- ULID Generation ----

/**
 * Generate a new ULID (Universally Unique Lexicographically Sortable Identifier).
 * ULIDs are time-ordered and globally unique — safe for offline creation on multiple terminals.
 */
export function generateId(): string {
  return ulid();
}

// ---- Money Utilities ----
// All money values are stored as integers in the smallest currency unit (e.g., piasters for EGP).
// This eliminates floating-point precision errors.

/**
 * Convert a human-readable amount (e.g., 10.50) to the smallest currency unit (e.g., 1050 piasters).
 * @param amount - Human-readable amount (e.g., 10.50 EGP)
 * @param subunit - Number of subunits per unit (default: 100 for EGP piasters)
 */
export function toSmallestUnit(amount: number, subunit: number = 100): number {
  return Math.round(amount * subunit);
}

/**
 * Convert from smallest currency unit back to human-readable amount.
 * @param amount - Amount in smallest unit (e.g., 1050 piasters)
 * @param subunit - Number of subunits per unit (default: 100)
 */
export function fromSmallestUnit(amount: number, subunit: number = 100): number {
  return amount / subunit;
}

/**
 * Format a money amount (in smallest unit) for display.
 * @param amount - Amount in smallest currency unit
 * @param currencyCode - ISO currency code (default: 'EGP')
 * @param locale - Display locale (default: 'ar-EG')
 * @param subunit - Subunit divisor (default: 100)
 */
export function formatMoney(
  amount: number,
  currencyCode: string = 'EGP',
  locale: string = 'ar-EG',
  subunit: number = 100,
): string {
  const value = fromSmallestUnit(amount, subunit);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Safe integer addition for money values.
 */
export function addMoney(...amounts: number[]): number {
  return amounts.reduce((sum, a) => sum + a, 0);
}

/**
 * Safe integer subtraction for money values.
 */
export function subtractMoney(a: number, b: number): number {
  return a - b;
}

/**
 * Calculate percentage of a money amount.
 * Uses Math.round to ensure integer result.
 * @param amount - Base amount in smallest unit
 * @param percentage - Percentage as a whole number (e.g., 15 for 15%)
 */
export function percentageOf(amount: number, percentage: number): number {
  return Math.round((amount * percentage) / 100);
}

// ---- Tax Utilities ----
// Tax rates are stored in basis points (1% = 100 basis points).
// This avoids decimal division entirely.

/**
 * Calculate tax for an amount.
 * @param amount - Taxable amount in smallest currency unit
 * @param rateBasisPoints - Tax rate in basis points (e.g., 1400 for 14%)
 */
export function calculateTax(amount: number, rateBasisPoints: number): number {
  return Math.round((amount * rateBasisPoints) / 10000);
}

/**
 * Extract tax from a tax-inclusive price.
 * @param inclusivePrice - Price that already includes tax
 * @param rateBasisPoints - Tax rate in basis points
 */
export function extractTaxFromInclusive(
  inclusivePrice: number,
  rateBasisPoints: number,
): { netAmount: number; taxAmount: number } {
  const netAmount = Math.round((inclusivePrice * 10000) / (10000 + rateBasisPoints));
  const taxAmount = inclusivePrice - netAmount;
  return { netAmount, taxAmount };
}

// ---- Discount Utilities ----

import type { DiscountType } from './types/index.js';

/**
 * Calculate discount amount.
 * @param subtotal - Amount before discount (smallest unit)
 * @param discountType - PERCENTAGE or FIXED
 * @param discountValue - Percentage (0-100) or fixed amount (smallest unit)
 */
export function calculateDiscount(
  subtotal: number,
  discountType?: DiscountType,
  discountValue?: number,
): number {
  if (!discountType || !discountValue || discountValue <= 0) {
    return 0;
  }

  if (discountType === 'PERCENTAGE') {
    return percentageOf(subtotal, discountValue);
  }

  // FIXED — discount cannot exceed subtotal
  return Math.min(discountValue, subtotal);
}

// ---- Cart Calculation ----

import type { CartItem } from './types/index.js';

/**
 * Calculate a single cart line item's derived values.
 * All values are integers in smallest currency unit.
 */
export function calculateCartLine(
  unitPrice: number,
  quantity: number,
  taxRateBasisPoints: number,
  discountType?: DiscountType,
  discountValue?: number,
): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
} {
  const subtotal = unitPrice * quantity;
  const discountAmount = calculateDiscount(subtotal, discountType, discountValue);
  const taxable = subtotal - discountAmount;
  const taxAmount = calculateTax(taxable, taxRateBasisPoints);
  const total = taxable + taxAmount;

  return { subtotal, discountAmount, taxAmount, total };
}

/**
 * Calculate cart totals from an array of cart items.
 */
export function calculateCartTotals(items: CartItem[]): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
} {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;
  let totalAmount = 0;

  for (const item of items) {
    subtotal += item.subtotal;
    discountAmount += item.discountAmount;
    taxAmount += item.taxAmount;
    totalAmount += item.total;
  }

  return { subtotal, discountAmount, taxAmount, totalAmount };
}

// ---- Date Utilities ----

/**
 * Get current timestamp as ISO 8601 string.
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Format a date for display.
 * @param isoDate - ISO 8601 date string
 * @param locale - Display locale
 */
export function formatDate(isoDate: string, locale: string = 'ar-EG'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

/**
 * Format a date for display (date only, no time).
 */
export function formatDateOnly(isoDate: string, locale: string = 'ar-EG'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoDate));
}

// ---- Validation ----

/**
 * Check if a string is a valid ULID.
 */
export function isValidUlid(value: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
}

/**
 * Check if a value is a positive integer (for money/quantity).
 */
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Check if a value is a non-negative integer (for money/quantity, allows zero).
 */
export function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
