import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Gate for the Bitcoin (bip122) WalletConnect surface (namespace advertisement, `getAccountAddresses`
// session property/method, `signMessage` and `signPsbt`).
//
// Enabled on local and staging only, for testing — not on beta nor production (ic). `STAGING`
// already covers the test_fe / audit / e2e environments. Kept off in production and beta because
// signing still goes through `generic_sign_with_ecdsa` (schema `0xff`), whose key does not match the
// advertised P2WPKH address (schema `0x00`), so `signMessage` fails the recovery check and `signPsbt`
// hands the dApp a signature for the wrong key. Enable in production once chain-fusion-signer exposes
// a `btc_sign_prehash`-style endpoint that signs under the BTC schema.
export const BTC_WALLET_CONNECT_ENABLED = LOCAL || STAGING;
