import { STAGING } from '$lib/constants/app.constants';

// Gate for the Bitcoin (bip122) WalletConnect surface (namespace advertisement, `getAccountAddresses`
// session property/method, `signMessage` and `signPsbt`).
//
// Enabled on staging only, for testing. `STAGING` already covers the test_fe / audit / e2e
// environments. Signing now goes through the signer's `btc_sign_prehash`, which signs under the BTC
// key matching the advertised P2WPKH address. That endpoint is live on the staging chain-fusion-signer
// but NOT yet on the production one, so the gate stays off on beta and production (ic) until the
// production signer is upgraded. It is also off on local: the locally-built signer wasm is pinned to a
// release that predates `btc_sign_prehash`, so a local `signMessage`/`signPsbt` would hit a missing
// method. Re-enable local (and production) once a signer release exposing `btc_sign_prehash` is pinned.
export const BTC_WALLET_CONNECT_ENABLED = STAGING;
