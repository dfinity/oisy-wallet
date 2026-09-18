import { parseBoolEnvVar } from '$lib/utils/env.utils';

// Feature flag for the tips surface (the Tips menu entry and its modals).
//
// Per environment rather than a literal, which is how every other in-progress
// feature here is gated. `vite.config.ts` picks the `.env` file from
// `DFX_NETWORK`: `ic` reads `.env.production`, `beta` and `staging` read their
// own, and everything else — local dev and the `test_fe_*` frontends — reads
// `.env.development`. Only the last two list `VITE_TIPS_ENABLED`, so tips are
// on where the feature is being tested and off in production and beta, with no
// branch to keep alive and no line to flip at release. An undefined variable
// parses to `false`, which is what production and beta get.
export const TIPS_ENABLED = parseBoolEnvVar(import.meta.env.VITE_TIPS_ENABLED);
