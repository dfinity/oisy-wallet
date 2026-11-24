import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Paying charged calls with the user's own cycles: the Tools page's Usage credits card. On for
// local and staging builds until charged calls use the user's approval.
export const OWN_CYCLES_ENABLED = LOCAL || STAGING;
