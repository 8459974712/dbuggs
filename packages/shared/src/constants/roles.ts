export const ROLES = {
  B2C: 'b2c',
  B2B: 'b2b',
  RENTER: 'renter',
  DEALER: 'dealer',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
