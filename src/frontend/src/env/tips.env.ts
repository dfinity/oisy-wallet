import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Feature flag for the tips surface (the Tips menu entry and its modals).
//
// The environments are listed here rather than carried by a `VITE_` variable,
// which is how the other environment-gated features in this folder are written:
// see `BACKEND_EXCHANGE_ENABLED` and `ONRAMPER_ENABLED`. Nothing has to be kept
// in step in CI, nothing depends on a repository secret, and the set of places
// tips are on is one line anyone can read.
//
// `STAGING` already covers `test_fe_*`, audit and e2e, so this reaches fe1
// through fe4 without a per-deploy override. Beta and production are left out
// until the feature is ready for them, and widening is one more term.
export const TIPS_ENABLED = LOCAL || STAGING;
