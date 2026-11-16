// LI.FI's token address for native BTC, on its Bitcoin chain (`ChainId.BTC`).
export const LIFI_BTC_TOKEN_ADDRESS = 'bitcoin';

// The smallest amount LI.FI is asked to quote from BTC, in satoshis: ⌈294 / `LIFI_FEE_BPS`⌉. LI.FI's
// fee output never goes below 294 sats, the P2WPKH dust limit, while its quote still lists 25 bps of
// the amount (2026-11-13), so below this amount the fee paid would exceed the fee quoted.
export const LIFI_BTC_MIN_AMOUNT_SATOSHIS = 117_600n;
