import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Gates the whole "transaction priority" work on the EVM send flow: the Details section, the
// estimated-fee row that replaces the max-fee one, and the priority step. Local and staging
// only while the design settles; BETA and PROD keep the previous single-tier send form
// unchanged.
export const SEND_TRANSACTION_PRIORITY_ENABLED = LOCAL || STAGING;
