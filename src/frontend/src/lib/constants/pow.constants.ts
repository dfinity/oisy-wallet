// The interval in milliseconds between calls to the PoW-protected allowSigning function
export const POW_CHALLENGE_INTERVAL_MILLIS = 60_000;

// Minimum cycles threshold that users must have available for signer operations
export const POW_MIN_CYCLES_THRESHOLD = 1_000_000_000n;

// Maximum number of attempts to check for sufficient cycles before signing out the user
export const MAX_CHECK_ATTEMPTS = 100;

// Interval in milliseconds between cycle availability checks
export const CHECK_INTERVAL_MS = 7000;
