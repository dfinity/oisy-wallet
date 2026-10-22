import { PLAUSIBLE_EVENT_RESULT_STATUSES, PLAUSIBLE_EVENT_SEVERITIES } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { trackContact } from '$lib/services/contacts-analytics.services';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('contacts-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackContact', () => {
		it('tracks the step, the outcome and the severity under the contacts context', () => {
			trackContact({
				step: 'load_all',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				severity: PLAUSIBLE_EVENT_SEVERITIES.WARN
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'contact',
				metadata: {
					event_context: 'contacts',
					event_modifier: 'load_all',
					result_status: 'success',
					event_severity: 'warn'
				}
			});
		});

		it('adds result_error on a failure', () => {
			trackContact({
				step: 'load_all',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				severity: PLAUSIBLE_EVENT_SEVERITIES.ERROR,
				error: 'Canister is stopped'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'contact',
				metadata: {
					event_context: 'contacts',
					event_modifier: 'load_all',
					result_status: 'error',
					event_severity: 'error',
					result_error: 'Canister is stopped'
				}
			});
		});

		it('omits event_severity and an empty result_error', () => {
			trackContact({
				step: 'load_all',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				error: ''
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'contact',
				metadata: {
					event_context: 'contacts',
					event_modifier: 'load_all',
					result_status: 'error'
				}
			});
		});
	});
});
