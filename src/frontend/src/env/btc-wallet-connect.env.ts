import { BETA, LOCAL, PROD, STAGING } from '$lib/constants/app.constants';

// Gate for the Bitcoin (bip122) WalletConnect surface (namespace advertisement, `getAccountAddresses`
// session property/method, `signMessage` and `signPsbt`).
//
// Signing goes through the signer's `btc_sign_prehash`, which signs under the BTC key matching the
// advertised P2WPKH address (unlike `generic_sign_with_ecdsa`, whose generic key does not). That
// endpoint is now live on every signer, including production, so the surface is enabled everywhere.
// Kept as an explicit kill-switch for the initial production rollout: drop `|| BETA || PROD` to turn
// it off on beta/production while keeping local and staging for debugging. Remove this gate once BTC
// WalletConnect is confirmed stable on production.
export const BTC_WALLET_CONNECT_ENABLED = LOCAL || STAGING || BETA || PROD;
