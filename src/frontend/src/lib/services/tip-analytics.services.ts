import type { TipError } from '$declarations/backend/backend.did';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENT_TIP_ERROR_TYPES,
	PLAUSIBLE_EVENTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import type { KeysOfUnion } from '$lib/types/utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import { IcrcTransferError, type IcrcLedgerDid } from '@icp-sdk/canisters/ledger/icrc';

/**
 * The step in the tip funnel, carried in `event_modifier` so a single `tip` event
 * covers both sides of it. Mirrors `trackPersonalNoteShare`, which replaced six
 * flat `note_share_*` events with one shaped this way — the funnel is only
 * answerable if every step is the same event name.
 */
export type TipStep =
	| 'open' // a tip surface was opened: the sender's modal, or a claim link
	| 'create' // the sender reserved a tip
	| 'copy' // the sender copied the link
	| 'share' // the sender used the native share sheet
	| 'cancel' // the sender revoked a reservation
	| 'reopen' // the sender reopened a live tip from History and its link was recovered, or not
	| 'claim' // a recipient claimed, or tried to
	| 'welcome'; // a first-time claimer was shown what OISY is

export interface TrackTipParams {
	// The funnel step → `event_modifier`.
	step: TipStep;
	// Which side of the funnel → `source_location`.
	side: 'sender' | 'claimer';
	// Outcome → `result_status`. Required even for steps that cannot fail, which
	// send `success`: a `(none)` on the dashboard should only ever mean a call
	// site forgot, not be the largest row by design.
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// Why the step failed → `result_error_type`; only with an `error` status. Built
	// with `toTipErrorType`, never from an error's message.
	errorType?: PLAUSIBLE_EVENT_TIP_ERROR_TYPES;
	// create → the expiry the sender picked, as its label (e.g. `expiry_24h`) →
	// `event_key: expiry` + `event_value`.
	expiry?: string;
	// create / claim → the token's symbol → `token_symbol`. Never an amount: that
	// is the user's money, and a per-event figure would make the stream a
	// spending log.
	symbol?: string;
}

// Typed against the candid declarations, so a variant added to either type
// fails the build until it is given a category here. Enumerating by hand is how
// `MessageTooLong` was once missed elsewhere in this feature.
const TIP_ERROR_TYPES: Record<KeysOfUnion<TipError>, PLAUSIBLE_EVENT_TIP_ERROR_TYPES> = {
	InvalidExpiry: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.INVALID_EXPIRY,
	ClaimInProgress: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.CLAIM_IN_PROGRESS,
	SecretCiphertextTooLarge: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.SECRET_CIPHERTEXT_TOO_LARGE,
	Uncovered: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.UNCOVERED,
	NotFound: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.NOT_FOUND,
	NotYourTip: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.NOT_YOUR_TIP,
	InvalidClaimCodeHash: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.INVALID_CLAIM_CODE_HASH,
	InvalidTipId: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.INVALID_TIP_ID,
	RateLimited: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.RATE_LIMITED,
	DuplicateTipId: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.DUPLICATE_TIP_ID,
	NotCancellable: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.NOT_CANCELLABLE,
	TransferFailed: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.TRANSFER_FAILED,
	InternalError: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.INTERNAL_ERROR,
	MessageTooLong: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.MESSAGE_TOO_LONG,
	TooManyTips: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.TOO_MANY_TIPS,
	InsufficientFunds: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.INSUFFICIENT_FUNDS,
	AmountTooSmall: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.AMOUNT_TOO_SMALL
};

const LEDGER_APPROVE_ERROR_TYPES: Record<
	KeysOfUnion<IcrcLedgerDid.ApproveError>,
	PLAUSIBLE_EVENT_TIP_ERROR_TYPES
> = {
	GenericError: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_GENERIC_ERROR,
	TemporarilyUnavailable: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_TEMPORARILY_UNAVAILABLE,
	Duplicate: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_DUPLICATE,
	BadFee: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_BAD_FEE,
	AllowanceChanged: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_ALLOWANCE_CHANGED,
	CreatedInFuture: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_CREATED_IN_FUTURE,
	TooOld: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_TOO_OLD,
	Expired: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_EXPIRED,
	InsufficientFunds: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.LEDGER_INSUFFICIENT_FUNDS
};

// A candid variant decodes to an object with exactly one key, the variant's name.
// A canister newer than this build can answer one we have no category for, which
// lands in `unknown` rather than inventing a value.
const variantErrorType = ({
	variant,
	types
}: {
	variant: unknown;
	types: Record<string, PLAUSIBLE_EVENT_TIP_ERROR_TYPES>;
}): PLAUSIBLE_EVENT_TIP_ERROR_TYPES => {
	if (isNullish(variant) || typeof variant !== 'object') {
		return PLAUSIBLE_EVENT_TIP_ERROR_TYPES.UNKNOWN;
	}

	const [name] = Object.keys(variant);

	return nonNullish(name) && Object.hasOwn(types, name)
		? types[name]
		: PLAUSIBLE_EVENT_TIP_ERROR_TYPES.UNKNOWN;
};

/**
 * The category of anything a tip call can throw.
 *
 * The backend wrapper throws the decoded `TipError` variant, the ledger client
 * wraps an approve refusal in `IcrcTransferError`, and everything else — a
 * transport failure, the agent, the vetKey decryption — is a plain `Error`. Only
 * the variant name is read: `TransferFailed`, `InternalError` and the ledger's
 * `GenericError` carry free text, and none of it goes out.
 */
export const toTipErrorType = (err: unknown): PLAUSIBLE_EVENT_TIP_ERROR_TYPES => {
	if (err instanceof IcrcTransferError) {
		return variantErrorType({ variant: err.errorType, types: LEDGER_APPROVE_ERROR_TYPES });
	}

	// A bare `Error` has no variant key; only a decoded `TipError` proves the
	// canister answered.
	if (err instanceof Error) {
		return PLAUSIBLE_EVENT_TIP_ERROR_TYPES.UNKNOWN;
	}

	return variantErrorType({ variant: err, types: TIP_ERROR_TYPES });
};

export const trackTip = ({
	step,
	side,
	resultStatus,
	errorType,
	expiry,
	symbol
}: TrackTipParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.TIP,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.TIPS,
			event_modifier: step,
			source_location:
				side === 'sender'
					? PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TIP_SENDER
					: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TIP_CLAIMER,
			result_status: resultStatus,
			...(nonNullish(errorType) && { result_error_type: errorType }),
			...(notEmptyString(expiry) && {
				event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.EXPIRY,
				event_value: expiry
			}),
			...(notEmptyString(symbol) && { token_symbol: symbol })
		}
	});
};
