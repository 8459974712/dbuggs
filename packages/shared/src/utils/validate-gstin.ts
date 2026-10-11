export function validateGstin(gstin: string): boolean {
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin);
}

export function maskAadhaar(aadhaar: string): string {
  return `XXXX XXXX ${aadhaar.slice(-4)}`;
}
