import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Topping up a canister with TCYCLES. On for local and staging builds until a real top-up
// on staging has been verified; kept as a kill switch after that.
export const CYCLES_TOP_UP_ENABLED = LOCAL || STAGING;
