import {
	PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SEVERITIES
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { toContactErrorType, trackContact } from '$lib/services/contacts-analytics.services';
import {
	CertifiedRejectErrorCode,
	RejectError,
	ReplicaRejectCode,
	requestIdOf
} from '@icp-sdk/core/agent';

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

		it('adds result_error_type on a failure', () => {
			trackContact({
				step: 'load_all',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				severity: PLAUSIBLE_EVENT_SEVERITIES.ERROR,
				errorType: PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES.CALL_REJECTED
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'contact',
				metadata: {
					event_context: 'contacts',
					event_modifier: 'load_all',
					result_status: 'error',
					event_severity: 'error',
					result_error_type: 'call_rejected'
				}
			});
		});

		it('omits event_severity and result_error_type when they are not given', () => {
			trackContact({
				step: 'load_all',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR
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

	describe('toContactErrorType', () => {
		it('maps a rejected call to call_rejected', () => {
			const err = RejectError.fromCode(
				new CertifiedRejectErrorCode(
					requestIdOf({ method_name: 'get_contacts' }),
					ReplicaRejectCode.CanisterError,
					'Canister is stopped',
					'IC0508'
				)
			);

			expect(toContactErrorType(err)).toBe(PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES.CALL_REJECTED);
		});

		it('maps anything else to unknown', () => {
			expect(toContactErrorType(new Error('Failed to fetch'))).toBe(
				PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES.UNKNOWN
			);
			expect(toContactErrorType({ ContactNotFound: null })).toBe(
				PLAUSIBLE_EVENT_CONTACT_ERROR_TYPES.UNKNOWN
			);
		});
	});
});
