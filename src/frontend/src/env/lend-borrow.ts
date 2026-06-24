import { LIQUIDIUM_ENABLED } from '$env/liquidium';
import { STAGING } from '$lib/constants/app.constants';

// Route-level gate for the lend & borrow surface (provider pages, Borrow page,
// Liabilities tab, nav). Layered over per-provider flags: a provider is active
// only when both this and that provider are on.
// TODO: broaden once the feature is complete.
export const LEND_BORROW_ENABLED = STAGING;

// At least one lend & borrow provider active (feature on AND provider on).
export const anyLendBorrowProviderEnabled = LEND_BORROW_ENABLED && LIQUIDIUM_ENABLED;
