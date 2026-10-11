export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function calculateGst(amount: number, rate = 0.18): { base: number; gst: number; total: number } {
  const base = Math.round(amount / (1 + rate));
  const gst = amount - base;
  return { base, gst, total: amount };
}
