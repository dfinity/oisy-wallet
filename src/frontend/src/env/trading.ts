import { OISY_TRADE_ENABLED } from '$env/oisy-trade';

// At least one trading provider active. The temporary whole-surface feature
// flag was removed once Limit Orders shipped; the Trading surface is now gated
// purely by the per-provider flags.
export const anyTradingProviderEnabled = OISY_TRADE_ENABLED;
