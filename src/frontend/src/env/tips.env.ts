import { BETA, LOCAL, PROD, STAGING } from '$lib/constants/app.constants';

// Feature flag for the tips surface (the Tips menu entry and its modals).
//
// The environments are listed here rather than carried by a `VITE_` variable,
// which is how the other environment-gated features in this folder are written:
// see `BACKEND_EXCHANGE_ENABLED` and `ONRAMPER_ENABLED`. Nothing has to be kept
// in step in CI, nothing depends on a repository secret, and the set of places
// tips are on is one line anyone can read.
//
// That set is now every environment, production included. Kept as the four
// terms rather than collapsed to `true`, because they are what a narrowing
// edits: dropping `PROD` turns the feature off in production on the next
// deploy, with nothing else to change and no flag to reintroduce. It is the
// kill-switch, and it reads as one.
//
// `STAGING` covers `test_fe_*`, audit and e2e as well as staging itself.
export const TIPS_ENABLED = LOCAL || STAGING || BETA || PROD;
