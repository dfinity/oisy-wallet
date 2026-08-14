import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Gate for the generated one-line summary of a Solana transaction, on every screen that shows one.
//
// The sentence is written by the IC LLM canister, so facts OISY derived leave the wallet and reach
// off-chain workers: on a sign request that happens before the user has approved anything, and in
// the history it happens for transactions they have already made. That is a product decision that
// has not been taken yet, so the experiment is confined to local and the test deployments. Widen
// this only once the disclosure is agreed (see the PR description).
export const SOL_SUMMARY_ENABLED = LOCAL || STAGING;
