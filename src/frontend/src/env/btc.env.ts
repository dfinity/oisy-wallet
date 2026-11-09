import { LOCAL, STAGING } from '$lib/constants/app.constants';

export const BTC_EXTENSION_FEATURE_FLAG_ENABLED = true;

// Feature flag: BTC sends move from the Chain Fusion Signer to the backend. So far it covers the
// UTXOs every BTC flow loads, which come from the backend's `btc_get_spendable_utxos` instead of
// the Bitcoin canister and `btc_get_pending_transactions`. Off in production, since a fault in the
// new endpoint would block every BTC flow until a new release.
export const BTC_SEND_VIA_BACKEND_ENABLED = LOCAL || STAGING;
