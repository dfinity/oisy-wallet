import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
import { LOCAL } from '$lib/constants/app.constants';

// Gate for the OISY Trade *swap provider*, separate from `OISY_TRADE_ENABLED`,
// which gates the Trading surface. The two answer different questions — "is the
// swap integration ready?" versus "is the venue up?" — so the provider requires
// both: a canister outage has to take the swap offer down with the Trading tab
// rather than leave a provider quoting against a dead canister.
export const OISY_TRADE_SWAP_ENABLED = LOCAL;

// The double gate expressed once, rather than re-anded at each call site.
export const oisyTradeSwapEnabled = OISY_TRADE_SWAP_ENABLED && OISY_TRADE_ENABLED;
