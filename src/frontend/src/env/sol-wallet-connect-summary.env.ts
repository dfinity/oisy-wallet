import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Gate for the generated one-line summary on the Solana WalletConnect sign review.
//
// The sentence is written by the IC LLM canister, which means the review's deterministic facts
// leave the wallet and reach off-chain workers before the user has approved anything. That is a
// product decision that has not been taken yet, so the experiment is confined to local and the
// test deployments. Widen this only once the disclosure is agreed (see the PR description).
export const SOL_WALLET_CONNECT_SUMMARY_ENABLED = LOCAL || STAGING;
