import { OISY_TRADE_ENABLED } from '$env/oisy-trade';

export const OISY_TRADE_SWAP_ENABLED = true;

// The double gate expressed once, rather than re-anded at each call site.
export const oisyTradeSwapEnabled = OISY_TRADE_SWAP_ENABLED && OISY_TRADE_ENABLED;
