import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
import { STAGING } from '$lib/constants/app.constants';

// Temporary feature flag for the whole Trading surface (Trading tab, deposit,
// limit-order and withdraw flows). Enabled in staging during development and
// kept off in production until the feature ships; removed once it does.
// TODO: remove once Limit Orders ships to production.
export const TRADING_ENABLED = STAGING;

// At least one trading provider active (feature on AND provider on).
export const anyTradingProviderEnabled = TRADING_ENABLED && OISY_TRADE_ENABLED;
