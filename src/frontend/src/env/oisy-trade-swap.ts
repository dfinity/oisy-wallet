import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Gate for the OISY Trade *swap provider*, separate from `OISY_TRADE_ENABLED`,
// which gates the Trading surface. The two answer different questions — "is the
// swap integration ready?" versus "is the venue up?" — so the provider requires
// both: a canister outage has to take the swap offer down with the Trading tab
// rather than leave a provider quoting against a dead canister.
//
// Widened from `LOCAL` to include staging once the offer came from the real order
// book (2026-09-04). While the quote was a 1:1 placeholder this had to stay local:
// a fabricated rate out-ranks almost every real offer, so it would have been
// pre-selected on any pair that is not near parity, showing a number the execution
// could not honour.
//
// Deliberately still short of production. A staging build reaches whatever
// `VITE_STAGING_OISY_TRADE_CANISTER_ID` points at, so if that is the production
// canister these are real fill-or-kill orders against the live book — which is the
// point at this stage (it is the only way to observe a real fill, and which leg the
// venue withholds its taker fee from is still unconfirmed) but is also why the last
// step is a separate decision. Note `STAGING` is also true for `test_fe_*`, `audit`
// and `e2e` builds.
export const OISY_TRADE_SWAP_ENABLED = LOCAL || STAGING;

// The double gate expressed once, rather than re-anded at each call site.
export const oisyTradeSwapEnabled = OISY_TRADE_SWAP_ENABLED && OISY_TRADE_ENABLED;
