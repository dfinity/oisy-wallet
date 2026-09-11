import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Gates the whole "transaction priority" work on the EVM send flow: the priority row and its
// options, and the estimated-fee row that replaces the max-fee one. Local and staging only
// while the design settles; BETA and PROD keep the previous single-tier send form unchanged.
export const SEND_TRANSACTION_PRIORITY_ENABLED = LOCAL || STAGING;
