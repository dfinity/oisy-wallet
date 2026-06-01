import {
	PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
	PLAUSIBLE_EVENTS,
	type PLAUSIBLE_EVENT_CONTEXTS,
	type PLAUSIBLE_EVENT_RESULT_STATUSES,
	type PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS,
	type PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { nonNullish } from '@dfinity/utils';

type ExportDataContextSelector =
	| {
			context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS;
			subcontext:
				| PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS.BASIC
				| PLAUSIBLE_EVENT_SUBCONTEXT_TOKENS.EXTENDED;
	  }
	| {
			context: PLAUSIBLE_EVENT_CONTEXTS.TRANSACTIONS;
			subcontext:
				| PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS.BASIC
				| PLAUSIBLE_EVENT_SUBCONTEXT_TRANSACTIONS.EXTENDED;
	  };

export type TrackExportDataParams = ExportDataContextSelector & {
	resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES;
	error?: string;
	errorCode?: string;
};

export const trackExportData = ({
	context,
	subcontext,
	resultStatus,
	error,
	errorCode
}: TrackExportDataParams) => {
	trackEvent({
		name: PLAUSIBLE_EVENTS.EXPORT_DATA,
		metadata: {
			event_context: context,
			event_subcontext: subcontext,
			source_location: PLAUSIBLE_EVENT_SOURCE_LOCATIONS.SETTINGS_PAGE,
			result_status: resultStatus,
			...(nonNullish(error) && { result_error: error }),
			...(nonNullish(errorCode) && { result_error_code: errorCode })
		}
	});
};
