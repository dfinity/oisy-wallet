import { LOCAL, STAGING } from '$lib/constants/app.constants';

// Topping up a canister with TCYCLES. Kept as a kill switch: `false` hides the Top up button
// everywhere and leaves the pointer to Top up out of the send warning.
export const CYCLES_TOP_UP_ENABLED = true as boolean;

// Sending TCYCLES first asks whether to send them or top up a canister. On for local and staging
// builds until it has been tried on staging.
export const CYCLES_SEND_OR_TOP_UP_ENABLED = CYCLES_TOP_UP_ENABLED && (LOCAL || STAGING);
