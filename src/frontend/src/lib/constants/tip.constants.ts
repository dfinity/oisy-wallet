import { MILLISECONDS_IN_SECOND, SECONDS_IN_HOUR } from '$lib/constants/app.constants';

const HOUR_IN_MILLISECONDS = SECONDS_IN_HOUR * MILLISECONDS_IN_SECOND;

/**
 * The expiry choices a sender picks from.
 *
 * Topped out at 7 days rather than the design's 1 month: an unclaimed tip holds
 * an allowance against the sender's own balance, so a month is a month of
 * encumbered funds for a tip that may never be claimed. `MAX_TIP_EXPIRY_NS`
 * enforces the same ceiling, so a client bypassing this list gains nothing.
 */
export const TIP_EXPIRY_OPTIONS = [
	{ ms: 24 * HOUR_IN_MILLISECONDS, labelKey: 'expiry_24h' },
	{ ms: 3 * 24 * HOUR_IN_MILLISECONDS, labelKey: 'expiry_3d' },
	{ ms: 7 * 24 * HOUR_IN_MILLISECONDS, labelKey: 'expiry_7d' }
] as const;

/** Matches `MAX_TIP_MESSAGE_CHARS` in the canister, which rejects anything longer. */
export const TIP_MESSAGE_MAX_CHARS = 250;

/** The form's default: the shortest option, so the funds are tied up least. */
export const DEFAULT_TIP_EXPIRY_MS = 24 * HOUR_IN_MILLISECONDS;
