export class CanisterInternalError extends Error {}

// Distinguishable Onramper widget URL signing failures, so the UI/telemetry can
// tell apart a misconfigured backend secret from a transient rate limit.
export class OnramperSecretNotConfiguredError extends CanisterInternalError {}

export class OnramperRateLimitedError extends CanisterInternalError {}

// The caller hit the personal-notes vetKey rate limit; the UI shows a
// "temporarily unavailable, try again" state rather than a generic failure.
export class PersonalNotesRateLimitedError extends CanisterInternalError {}
