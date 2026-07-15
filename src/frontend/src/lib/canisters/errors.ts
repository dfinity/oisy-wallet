export class CanisterInternalError extends Error {}

// Distinguishable Onramper widget URL signing failures, so the UI/telemetry can
// tell apart a misconfigured backend secret from a transient rate limit.
export class OnramperSecretNotConfiguredError extends CanisterInternalError {}

export class OnramperRateLimitedError extends CanisterInternalError {}
