import type { BtcBroadcastTransactionError } from '$declarations/backend/backend.did';

export class CanisterInternalError extends Error {}

// A typed answer of `btc_broadcast_transaction`. The variant says whether anything can have gone
// out, which decides what a caller may tell the user and whether it may drop what it tracks.
export class BtcBroadcastTransactionCanisterError extends CanisterInternalError {
	constructor(
		readonly variant: BtcBroadcastTransactionError,
		message: string
	) {
		super(message);
	}
}

// Distinguishable Onramper widget URL signing failures, so the UI/telemetry can
// tell apart a misconfigured backend secret from a transient rate limit.
export class OnramperSecretNotConfiguredError extends CanisterInternalError {}

export class OnramperRateLimitedError extends CanisterInternalError {}

// The caller hit the personal-notes vetKey rate limit; the UI shows a
// "temporarily unavailable, try again" state rather than a generic failure.
export class PersonalNotesRateLimitedError extends CanisterInternalError {}
