// Interval in milliseconds between a new attempt is made by the pow scheduler request and solve an new challenge
export const POW_CHALLENGE_INTERVAL_MILLIS = 60_000;

// Minimum cycles allowance required for signer operations before triggering a PoW challenge.
export const POW_MIN_CYCLES_THRESHOLD = 200_000_000_000n;

// Threshold below which cycles are considered effectively zero due to fragmented costs, triggering the PoW protector modal.
// This is set lower than POW_MIN_CYCLES_THRESHOLD to provide a critical warning before cycles are completely depleted.
export const POW_ZERO_CYCLES_THRESHOLD = 50_000_000_000n; // 26_153_846_153n

// Maximum number of attempts to check for sufficient cycles before signing out the user
export const POW_MAX_CHECK_ATTEMPTS = 100;

// Interval in milliseconds between cycle availability polling checks
export const POW_CHECK_INTERVAL_MS = 7000;
