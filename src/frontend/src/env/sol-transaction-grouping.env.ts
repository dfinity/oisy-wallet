import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Gate for showing the rows of one Solana transaction as a single collapsible entry.
//
// The grouping itself is deterministic, but it changes what the activity list looks like for every
// Solana user, and how a bundled transaction should be named when it is not a recognisable swap is
// still a product question. Confined to local and the test deployments until that is settled.
export const SOL_TRANSACTION_GROUPING_ENABLED = LOCAL || STAGING;
