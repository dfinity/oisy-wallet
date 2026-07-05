import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENT_VALUES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { notEmptyString } from '@dfinity/utils';

// The note-lifecycle step, carried in `event_modifier` so one `personal_note`
// event covers create/edit/delete and the surface-open ping.
export type PersonalNoteStep = 'create' | 'edit' | 'delete' | 'open';

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
