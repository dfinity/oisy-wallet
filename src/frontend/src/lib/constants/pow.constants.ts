// The interval in milliseconds between calls to the PoW-protected allowSigning function
export const POW_CHALLENGE_INTERVAL_MILLIS = 60_000;

// Minimum cycles threshold that users must have available for signer operations
// Ideally 20% of START_DIFFICULTY x CYCLES_PER_DIFFICULTY
export const POW_MIN_CYCLES_THRESHOLD = 300_000_000n;
