import { parseBoolEnvVar } from '$lib/utils/env.utils';

// Enables the POW Protector on the frontend. Remember to also enable/disable the feature in the backend.
export const POW_FEATURE_ENABLED = parseBoolEnvVar(import.meta.env.VITE_POW_FEATURE_ENABLED);

// The interval in milliseconds between calls to the PoW-protected allowSigning function
export const POW_CHALLENGE_INTERVAL_MILLIS = 120_000;

// Minimum cycles threshold that users must have available for signer operations
export const POW_MIN_CYCLES_THRESHOLD = 400_000_000_000_000n;
