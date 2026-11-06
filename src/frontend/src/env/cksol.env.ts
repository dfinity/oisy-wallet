import { LOCAL, STAGING } from '$lib/constants/app.constants';

// ckSOL and its Chain Fusion conversions, on local and staging builds only until a real
// conversion in both directions has been verified on staging.
export const CKSOL_ENABLED = LOCAL || STAGING;
