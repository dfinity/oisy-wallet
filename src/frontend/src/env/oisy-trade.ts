import { STAGING } from '$lib/constants/app.constants';

// Permanent per-provider kill-switch for OISY TRADE, layered under TRADING_ENABLED.
// Lets us disable the provider quickly (e.g. when its canister is unreachable)
// without a deploy. Unlike the temporary Trading feature flag, this one stays.
export const OISY_TRADE_ENABLED = STAGING;
