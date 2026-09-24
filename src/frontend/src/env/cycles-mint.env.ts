import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Minting TCYCLES from ICP, on local and staging builds only until a real mint, including
// the background recovery of an interrupted one, has been verified on staging.
export const CYCLES_MINT_ENABLED = LOCAL || STAGING;
