import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTEXTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	type PLAUSIBLE_EVENT_SEVERITIES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { nonNullish, notEmptyString } from '@dfinity/utils';

// The contacts step, carried in `event_modifier` so one `contact` event covers every step.
export type ContactStep = 'load_all';

export interface TrackContactParams {
	// The step → `event_modifier`.
	step: ContactStep;
	// Outcome → `result_status`.
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// How serious it is → `event_severity`. Only set when something needs watching.
	severity?: PLAUSIBLE_EVENT_SEVERITIES;
	// Sanitized (IC-request-id-stripped) error string; omitted when empty.
	error?: string;
}

// One structured event for the contacts, mirroring `trackPersonalNote`: the step rides in
// `event_modifier` and the outcome in `result_status`, so a single `contact` event covers every
// step instead of a name-per-step. Never carries a contact name, an address, a contact id, or PII.
export const trackContact = ({ step, resultStatus, severity, error }: TrackContactParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.CONTACT,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.CONTACTS,
			event_modifier: step,
			result_status: resultStatus,
			...(nonNullish(severity) && { event_severity: severity }),
			...(notEmptyString(error) && { result_error: error })
		}
	});
};
