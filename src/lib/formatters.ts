/**
 * Currency and Numerical Formatting Helpers for LedgerForge
 * Safe for use in both Client Components and Server Components.
 */

/**
 * Currency formatter with Indian Rupee notation (Lakhs/Crores grouping)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats plain number with comma grouping
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
