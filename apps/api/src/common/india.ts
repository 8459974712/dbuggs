export const GST_RATE = 0.18;
export const HSN_LAPTOP = '8471';

export const GST_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya',
  '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
};

const PIN3: Record<string, string> = {
  '160': '04', '403': '30', '605': '34', '607': '34', '609': '34', '737': '11', '744': '35', '682': '32',
  '246': '05', '247': '05', '248': '05', '249': '05', '262': '05', '263': '05',
  '813': '20', '814': '20', '815': '20', '816': '20', '822': '20', '825': '20', '826': '20', '827': '20',
  '828': '20', '829': '20', '831': '20', '832': '20', '833': '20', '834': '20', '835': '20',
  '490': '22', '491': '22', '492': '22', '493': '22', '494': '22', '495': '22', '496': '22', '497': '22',
  '790': '12', '791': '12', '792': '12', '793': '17', '794': '17', '795': '14', '796': '15', '797': '13', '798': '13', '799': '16',
};

const PIN2: Record<string, string> = {
  '11': '07', '12': '06', '13': '06', '14': '03', '15': '03', '16': '03', '17': '02', '18': '01', '19': '01',
  '20': '09', '21': '09', '22': '09', '23': '09', '24': '09', '25': '09', '26': '09', '27': '09', '28': '09',
  '30': '08', '31': '08', '32': '08', '33': '08', '34': '08', '36': '24', '37': '24', '38': '24', '39': '24',
  '40': '27', '41': '27', '42': '27', '43': '27', '44': '27', '45': '23', '46': '23', '47': '23', '48': '23',
  '50': '36', '51': '37', '52': '37', '53': '37', '56': '29', '57': '29', '58': '29', '59': '29',
  '60': '33', '61': '33', '62': '33', '63': '33', '64': '33', '67': '32', '68': '32', '69': '32',
  '70': '19', '71': '19', '72': '19', '73': '19', '74': '19', '75': '21', '76': '21', '77': '21', '78': '18',
  '80': '10', '81': '10', '82': '10', '83': '10', '84': '10', '85': '10',
};

export function stateCodeFromPincode(pin: string): string | null {
  if (!/^\d{6}$/.test(pin || '')) return null;
  return PIN3[pin.slice(0, 3)] || PIN2[pin.slice(0, 2)] || null;
}

export function pincodeFromAddress(address: string): string | null {
  const all = (address || '').match(/\b\d{6}\b/g);
  return all ? all[all.length - 1] : null;
}

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36];
}

export function validateGstin(raw: string): { valid: boolean; gstin: string; reason?: string; stateCode?: string; state?: string; pan?: string } {
  const gstin = (raw || '').trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
    return { valid: false, gstin, reason: 'GSTIN format is invalid (expected 15 characters like 22AAAAA0000A1Z5)' };
  }
  const stateCode = gstin.slice(0, 2);
  if (!GST_STATES[stateCode]) return { valid: false, gstin, reason: `Unknown state code ${stateCode}` };
  if (gstinCheckChar(gstin.slice(0, 14)) !== gstin[14]) {
    return { valid: false, gstin, reason: 'GSTIN check digit does not match — please re-check the number' };
  }
  return { valid: true, gstin, stateCode, state: GST_STATES[stateCode], pan: gstin.slice(2, 12) };
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ');
}

export function rupeesInWords(amount: number): string {
  let n = Math.round(Number(amount) || 0);
  if (n === 0) return 'Rupees Zero Only';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  return `Rupees ${parts.join(' ')} Only`;
}

export function financialYear(d = new Date()): string {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(y).slice(2)}${String(y + 1).slice(2)}`;
}

export function splitInclusiveGst(total: number, sellerState: string, buyerState: string | null) {
  const amount = Math.round(Number(total) * 100) / 100;
  const taxable = Math.round((amount / (1 + GST_RATE)) * 100) / 100;
  const tax = Math.round((amount - taxable) * 100) / 100;
  const intra = !buyerState || buyerState === sellerState;
  const cgst = intra ? Math.round((tax / 2) * 100) / 100 : 0;
  const sgst = intra ? Math.round((tax - cgst) * 100) / 100 : 0;
  const igst = intra ? 0 : tax;
  return { taxable, cgst, sgst, igst, tax, total: amount, intra };
}
