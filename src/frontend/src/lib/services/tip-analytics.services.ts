import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { nonNullish, notEmptyString } from '@dfinity/utils';

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
	| 'reopen' // the sender reopened a live tip from History
	| 'claim' // a recipient claimed, or tried to
	| 'welcome'; // a first-time claimer was shown what OISY is

/**
 * Why a claim did not pay out, when the step is `claim` and the status is not
 * success. Kept separate from `result_status` so the funnel can distinguish a
 * dead link from a live tip that could not be paid — they mean very different
 * things about whether the sender needs telling, and `shortBalance` is the one
 * the sender can actually fix.
 */
export type TipClaimOutcome = 'unavailable' | 'uncovered' | 'shortBalance' | 'failed';

export interface TrackTipParams {
	// The funnel step → `event_modifier`.
	step: TipStep;
	// Which side of the funnel → `source_location`.
	side: 'sender' | 'claimer';
	// Outcome → `result_status`; omitted for steps that cannot fail.
	resultStatus?: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// claim → which kind of failure, when there was one.
	outcome?: TipClaimOutcome;
	// create → the expiry the sender picked, as a human label (e.g. `24h`).
	expiry?: string;
	// create / claim → the token's symbol. Never an amount: that is the user's
	// money, and a per-event figure would make the stream a spending log.
	symbol?: string;
	// Sanitized error string; omitted when empty.
	error?: string;
}

export const trackTip = ({
	step,
	side,
	resultStatus,
	outcome,
	expiry,
	symbol,
	error
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
			...(nonNullish(resultStatus) && { result_status: resultStatus }),
			...(notEmptyString(outcome) && { outcome }),
			...(notEmptyString(expiry) && { expiry }),
			...(notEmptyString(symbol) && { symbol }),
			...(notEmptyString(error) && { result_error: error })
		}
	});
};
