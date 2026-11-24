import { PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import {
	trackChargedCallInsufficientAllowance,
	trackOisyAllowanceRequest
} from '$lib/services/allowance-analytics.services';
import * as analytics from '$lib/services/analytics.services';
import type { MockInstance } from 'vitest';

describe('allowance-analytics.services', () => {
	let track: MockInstance;

	beforeEach(() => {
		vi.restoreAllMocks();
		track = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
	});

	describe('trackOisyAllowanceRequest', () => {
		it.each([
			{ trigger: 'load', answer: 'granted' },
			{ trigger: 'load', answer: 'skipped' },
			{ trigger: 'insufficient_allowance', answer: 'refused' }
		] as const)('sends $trigger with $answer, and nothing else', ({ trigger, answer }) => {
			trackOisyAllowanceRequest({ trigger, answer });

			expect(track).toHaveBeenCalledExactlyOnceWith({
				name: PLAUSIBLE_EVENTS.OISY_ALLOWANCE_REQUEST,
				metadata: { event_trigger: trigger, event_key: answer }
			});
		});
	});

	describe('trackChargedCallInsufficientAllowance', () => {
		it('sends the method as an error for an insufficient allowance, and nothing else', () => {
			trackChargedCallInsufficientAllowance({ method: 'eth_sign_transaction' });

			expect(track).toHaveBeenCalledExactlyOnceWith({
				name: PLAUSIBLE_EVENTS.CHARGED_CALL,
				metadata: {
					event_key: 'eth_sign_transaction',
					result_status: 'error',
					result_error_type: 'insufficient_allowance'
				}
			});
		});
	});
});
