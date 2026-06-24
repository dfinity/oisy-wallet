import { STAGING } from '$lib/constants/app.constants';

// Per-provider gate for Liquidium, layered under LEND_BORROW_ENABLED.
// TODO: broaden once the integration is ready.
export const LIQUIDIUM_ENABLED = STAGING;
