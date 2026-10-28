import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Canister top-up as an OISY feature of its own: the navigation item, paying with ICP, the
// token picker and the canister step's Recently topped up and Contacts tabs. On for local
// and staging builds until a real ICP top-up on staging, its recovery included, has been
// verified; then on everywhere and kept as a kill switch.
export const CANISTER_TOP_UP_ENABLED = LOCAL || STAGING;
