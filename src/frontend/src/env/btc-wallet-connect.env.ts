import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Gate for the Bitcoin (bip122) WalletConnect surface (namespace advertisement, `getAccountAddresses`
// session property/method, `signMessage` and `signPsbt`).
//
// Enabled on local and staging only, for testing — not on beta nor production (ic). `STAGING` already
// covers the test_fe / audit / e2e environments. Signing goes through the signer's `btc_sign_prehash`,
// which signs under the BTC key matching the advertised P2WPKH address (unlike
// `generic_sign_with_ecdsa`, whose generic key does not). That endpoint ships in chain-fusion-signer
// v0.5.1 — the release pinned for local deploys — and is live on the staging signer, but the
// production signer has not been upgraded to it yet. Enable on beta and production once it is;
// until then a `signMessage` there would hit a missing method.
export const BTC_WALLET_CONNECT_ENABLED = LOCAL || STAGING;
