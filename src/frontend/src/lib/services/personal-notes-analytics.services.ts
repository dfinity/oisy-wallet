import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENT_SUBCONTEXT_NOTES,
	PLAUSIBLE_EVENT_VALUES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { nonNullish, notEmptyString } from '@dfinity/utils';

// The note-lifecycle step, carried in `event_modifier` so one `personal_note`
// event covers create/edit/delete, the surface-open ping, and opening a note's
// read-only preview.
export type PersonalNoteStep = 'create' | 'edit' | 'delete' | 'open' | 'view';

export interface TrackPersonalNoteParams {
	// The lifecycle step → `event_modifier`.
	step: PersonalNoteStep;
	// Outcome → `result_status` (create/edit/delete: success|error; open: success).
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// Set only on the user's first successful create → `event_value: first_note`.
	isFirstNote?: boolean;
	// Sanitized (IC-request-id-stripped) error string; omitted when empty.
	error?: string;
}

// One structured event for the personal-notes lifecycle, mirroring `trackTrading`
// / `trackTokenManage`: the step rides in `event_modifier` and the outcome in
// `result_status`, so a single `personal_note` event covers the whole lifecycle
// instead of a name-per-step. Never carries the note text, a note id, or PII.
export const trackPersonalNote = ({
	step,
	resultStatus,
	isFirstNote,
	error
}: TrackPersonalNoteParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.PERSONAL_NOTE,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.PERSONAL_NOTES,
			event_modifier: step,
			source_location: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.NOTES,
			result_status: resultStatus,
			...(isFirstNote === true && { event_value: PLAUSIBLE_EVENT_VALUES.FIRST_NOTE }),
			...(notEmptyString(error) && { result_error: error })
		}
	});
};

// The share-funnel step, carried in `event_modifier` so one `personal_note_share`
// event covers the whole flow (creator dialog + recipient page) differentiated by
// properties, replacing the six former flat `note_share_*` events.
export type PersonalNoteShareStep =
	| 'open' // a share surface was opened — the dialog (creator) or the link page (recipient)
	| 'create' // creator generated a link
	| 'reveal' // recipient revealed the note
	| 'copy' // recipient copied the revealed note
	| 'close' // recipient dismissed the revealed note (→ outro)
	| 'unavailable' // recipient hit a dead/expired/used link
	| 'discover'; // recipient clicked the "Discover OISY" CTA

export interface TrackPersonalNoteShareParams {
	// The funnel step → `event_modifier`.
	step: PersonalNoteShareStep;
	// Which side of the funnel → `source_location` (creator dialog vs. recipient page).
	side: 'creator' | 'recipient';
	// Create outcome → `result_status` (success|error); omitted for the other steps.
	resultStatus?: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// create / reveal → `single_use` (emitted for both true and false).
	singleUse?: boolean;
	// create → the human expiry label the user picked (e.g. `7d`).
	expiry?: string;
	// discover → `source_detail` (`outro` | `unavailable`).
	sourceDetail?: 'outro' | 'unavailable';
	// Sanitized (IC-request-id-stripped) error string; create error only, omitted when empty.
	error?: string;
}

export const trackPersonalNoteShare = ({
	step,
	side,
	resultStatus,
	singleUse,
	expiry,
	sourceDetail,
	error
}: TrackPersonalNoteShareParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.PERSONAL_NOTE_SHARE,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.PERSONAL_NOTES,
			event_subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_NOTES.SHARE,
			event_modifier: step,
			source_location:
				side === 'creator'
					? PLAUSIBLE_EVENT_SOURCE_LOCATIONS.NOTE_SHARE_DIALOG
					: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.NOTE_SHARE_RECIPIENT_PAGE,
			...(nonNullish(resultStatus) && { result_status: resultStatus }),
			...(nonNullish(singleUse) && { single_use: `${singleUse}` }),
			...(notEmptyString(expiry) && { expiry }),
			...(notEmptyString(sourceDetail) && { source_detail: sourceDetail }),
			...(notEmptyString(error) && { result_error: error })
		}
	});
};
