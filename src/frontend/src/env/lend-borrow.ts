import { LIQUIDIUM_ENABLED } from '$env/liquidium';

// Route-level gate for the lend & borrow surface (provider pages, Borrow page,
// Liabilities tab, nav). Layered over per-provider flags: a provider is active
// only when both this and that provider are on.
export const LEND_BORROW_ENABLED = true;

// At least one lend & borrow provider active (feature on AND provider on).
export const anyLendBorrowProviderEnabled: boolean = LEND_BORROW_ENABLED && LIQUIDIUM_ENABLED;
