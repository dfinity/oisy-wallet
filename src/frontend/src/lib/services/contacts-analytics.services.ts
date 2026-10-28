import {
	PLAUSIBLE_EVENTS,
	PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES,
	PLAUSIBLE_EVENT_CONTEXTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	type PLAUSIBLE_EVENT_SEVERITIES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { nonNullish } from '@dfinity/utils';
import { RejectError } from '@icp-sdk/core/agent';

// The contacts step, carried in `event_modifier` so one `contact` event covers every step.
export type ContactStep = 'load_all' | 'load_images';

export interface TrackContactParams {
	// The step → `event_modifier`.
	step: ContactStep;
	// Outcome → `result_status`.
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	// How serious it is → `event_severity`. Only set when something needs watching.
	severity?: PLAUSIBLE_EVENT_SEVERITIES;
	// Why the step failed → `result_error_type`; only with an `error` status. Never the error text.
	errorType?: PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES;
}

/**
 * The category of a contacts failure, tracked in place of its message. See
 * `PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES` for why the message itself is not.
 */
export const toContactErrorType = (err: unknown): PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES =>
	err instanceof RejectError
		? PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES.CALL_REJECTED
		: PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES.UNKNOWN;

// One structured event for the contacts, mirroring `trackPersonalNote`: the step rides in
// `event_modifier` and the outcome in `result_status`, so a single `contact` event covers every
// step instead of a name-per-step. Never carries a contact name, an address, a contact id, or PII.
export const trackContact = ({ step, resultStatus, severity, errorType }: TrackContactParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.CONTACT,
		metadata: {
			event_context: PLAUSIBLE_EVENT_CONTEXTS.CONTACTS,
			event_modifier: step,
			result_status: resultStatus,
			...(nonNullish(severity) && { event_severity: severity }),
			...(nonNullish(errorType) && { result_error_type: errorType })
		}
	});
};
