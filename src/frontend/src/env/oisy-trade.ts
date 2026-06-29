import { STAGING } from '$lib/constants/app.constants';

// Permanent per-provider flag for OISY TRADE, layered under TRADING_ENABLED.
// Build-time like the other env flags, so flipping it ships with a deploy. It
// stays after the temporary Trading feature flag is removed, so a single
// provider can be disabled independently (e.g. if its canister is unreachable).
export const OISY_TRADE_ENABLED = STAGING;
