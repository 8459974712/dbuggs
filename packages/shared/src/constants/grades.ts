export const GRADES = {
  'A+': { label: 'Like New', warrantyMonths: 12, depositMultiplier: 5 },
  'A':  { label: 'Excellent', warrantyMonths: 6, depositMultiplier: 4 },
  'B':  { label: 'Good', warrantyMonths: 3, depositMultiplier: 3 },
  'C':  { label: 'Fair', warrantyMonths: 0, depositMultiplier: 2 },
} as const;

export type Grade = keyof typeof GRADES;
