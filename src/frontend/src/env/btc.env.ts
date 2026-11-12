import { BETA, LOCAL, PROD, STAGING } from '$lib/constants/app.constants';

export const BTC_EXTENSION_FEATURE_FLAG_ENABLED = true;

// Feature flag: BTC sends move from the Chain Fusion Signer to the backend. It covers the UTXOs
// every BTC flow loads (`btc_get_spendable_utxos`), every send OISY broadcasts itself (built and
// signed in OISY, broadcast by `btc_broadcast_transaction`) and OpenCryptoPay's signing. On in every
// build. Dropping an environment returns all of them to the Chain Fusion Signer there, until that
// path is removed.
export const BTC_SEND_VIA_BACKEND_ENABLED = LOCAL || STAGING || BETA || PROD;
