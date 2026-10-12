/**
 * Utility to format Indian Rupee (INR) currency strings using en-IN standard grouping
 * e.g. 1499 -> ₹1,499; 129999 -> ₹1,29,999
 */
export function formatINR(amount: number): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (e) {
    return `₹${amount.toLocaleString('en-IN')}`;
  }
}
