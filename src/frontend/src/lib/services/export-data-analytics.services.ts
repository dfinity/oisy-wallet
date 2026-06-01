import {
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENTS,
	type PLAUSIBLE_EVENT_CONTEXTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { nonNullish } from '@dfinity/utils';

export type ExportDataContext =
	| PLAUSIBLE_EVENT_CONTEXTS.TOKENS_BASIC
	| PLAUSIBLE_EVENT_CONTEXTS.TOKENS_EXTENDED
	| PLAUSIBLE_EVENT_CONTEXTS.TRANSACTIONS_BASIC
	| PLAUSIBLE_EVENT_CONTEXTS.TRANSACTIONS_EXTENDED;

export interface TrackExportDataParams {
	context: ExportDataContext;
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	error?: string;
	errorCode?: string;
}

export const trackExportData = ({
	context,
	resultStatus,
	error,
	errorCode
}: TrackExportDataParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.EXPORT_DATA,
		metadata: {
			event_context: context,
			source_location: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SETTINGS_PAGE,
			result_status: resultStatus,
			...(nonNullish(error) && { result_error: error }),
			...(nonNullish(errorCode) && { result_error_code: errorCode })
		}
	});
};
