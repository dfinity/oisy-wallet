import { PLAUSIBLE_EVENT_CONTEXTS, PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { trackExportData } from '$lib/services/export-data-analytics.services';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('export-data-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackExportData', () => {
		it('tracks a tokens_basic success event', () => {
			trackExportData({
				context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS_BASIC,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'export_data',
				metadata: {
					event_context: 'tokens_basic',
					source_location: 'settings_page',
					result_status: 'success'
				}
			});
		});

		it('tracks a transactions_extended success event', () => {
			trackExportData({
				context: PLAUSIBLE_EVENT_CONTEXTS.TRANSACTIONS_EXTENDED,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'export_data',
				metadata: {
					event_context: 'transactions_extended',
					source_location: 'settings_page',
					result_status: 'success'
				}
			});
		});

		it('attaches result_error and result_error_code on the error path', () => {
			trackExportData({
				context: PLAUSIBLE_EVENT_CONTEXTS.TRANSACTIONS_BASIC,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				error: 'row build failed',
				errorCode: 'build_failed'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'export_data',
				metadata: {
					event_context: 'transactions_basic',
					source_location: 'settings_page',
					result_status: 'error',
					result_error: 'row build failed',
					result_error_code: 'build_failed'
				}
			});
		});

		it('omits result_error when only an error code is provided', () => {
			trackExportData({
				context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS_EXTENDED,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				errorCode: 'fx_rate_unavailable'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'export_data',
				metadata: {
					event_context: 'tokens_extended',
					source_location: 'settings_page',
					result_status: 'error',
					result_error_code: 'fx_rate_unavailable'
				}
			});
		});
	});
});
