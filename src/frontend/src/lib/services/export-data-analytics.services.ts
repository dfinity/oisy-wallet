import {
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	type PLAUSIBLE_EVENT_VALUES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { nonNullish } from '@dfinity/utils';

export type ExportDataType =
	| PLAUSIBLE_EVENT_VALUES.TOKENS_BASIC
	| PLAUSIBLE_EVENT_VALUES.TOKENS_EXTENDED
	| PLAUSIBLE_EVENT_VALUES.TRANSACTIONS_BASIC
	| PLAUSIBLE_EVENT_VALUES.TRANSACTIONS_EXTENDED;

export interface TrackExportDataParams {
	type: ExportDataType;
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	error?: string;
	errorCode?: string;
}

export const trackExportData = ({
	type,
	resultStatus,
	error,
	errorCode
}: TrackExportDataParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.EXPORT_DATA,
		metadata: {
			event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.TYPE,
			event_value: type,
			source_location: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SETTINGS_PAGE,
			result_status: resultStatus,
			...(nonNullish(error) && { result_error: error }),
			...(nonNullish(errorCode) && { result_error_code: errorCode })
		}
	});
};
