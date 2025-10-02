// The interval in milliseconds between calls to the PoW-protected allowSigning function
export const POW_CHALLENGE_INTERVAL_MILLIS = 60_000;

// Minimum cycles allowance required for signer operations before triggering a PoW challenge.
export const POW_MIN_CYCLES_THRESHOLD = 3_000_000_000n;

// Threshold below which cycles are considered effectively zero due to fragmented costs, triggering the PoW protector modal.
export const POW_ZERO_CYCLES_THRESHOLD = 26_153_846_153n;

// Maximum number of attempts to check for sufficient cycles before signing out the user
export const POW_MAX_CHECK_ATTEMPTS = 100;

// Interval in milliseconds between cycle availability checks
export const POW_CHECK_INTERVAL_MS = 7000;
