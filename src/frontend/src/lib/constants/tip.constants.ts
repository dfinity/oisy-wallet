import { MILLISECONDS_IN_SECOND, SECONDS_IN_HOUR } from '$lib/constants/app.constants';

const HOUR_IN_MILLISECONDS = SECONDS_IN_HOUR * MILLISECONDS_IN_SECOND;

/**
 * The expiry choices a sender picks from.
 *
 * Deliberately shorter than the design's 24 hours / 7 days / **1 month**: an
 * unclaimed tip holds an allowance against the sender's own balance, so a month
 * is a month of encumbered funds for a tip that may never be claimed. The
 * canister enforces the same 7-day ceiling, so a client bypassing this list
 * gains nothing.
 */
export const TIP_EXPIRY_OPTIONS = [
	{ ms: HOUR_IN_MILLISECONDS, labelKey: 'expiry_1h', recommended: false },
	{ ms: 24 * HOUR_IN_MILLISECONDS, labelKey: 'expiry_24h', recommended: true },
	{ ms: 7 * 24 * HOUR_IN_MILLISECONDS, labelKey: 'expiry_7d', recommended: false }
] as const;

/** Matches `MAX_TIP_MESSAGE_CHARS` in the canister, which rejects anything longer. */
export const TIP_MESSAGE_MAX_CHARS = 250;

/** The recommended option, and the form's default. */
export const DEFAULT_TIP_EXPIRY_MS = 24 * HOUR_IN_MILLISECONDS;
