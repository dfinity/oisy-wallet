import { PLAUSIBLE_EVENT_RESULT_STATUSES, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { trackCyclesTopUp } from '$lib/services/cycles-top-up-analytics.services';
import type { MockInstance } from 'vitest';

describe('trackCyclesTopUp', () => {
	let track: MockInstance;

	beforeEach(() => {
		vi.restoreAllMocks();
		track = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
	});

	it('carries only the context and source for an open', () => {
		trackCyclesTopUp({ step: 'open' });

		expect(track).toHaveBeenCalledExactlyOnceWith({
			name: PLAUSIBLE_EVENTS.CYCLES_TOP_UP,
			metadata: {
				event_context: 'compute',
				event_modifier: 'open',
				source_location: 'token_details'
			}
		});
	});

	it('carries the status, the token and the error code of a top-up', () => {
		trackCyclesTopUp({
			step: 'top_up',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			tokenSymbol: 'TCYCLES',
			errorCode: 'refunded'
		});

		expect(track).toHaveBeenCalledExactlyOnceWith({
			name: PLAUSIBLE_EVENTS.CYCLES_TOP_UP,
			metadata: {
				event_context: 'compute',
				event_modifier: 'top_up',
				source_location: 'token_details',
				result_status: 'error',
				token_symbol: 'TCYCLES',
				result_error_code: 'refunded',
				event_severity: 'error'
			}
		});
	});

	it.each([
		{ errorCode: 'refused' as const, severity: 'warn' },
		{ errorCode: 'unknown' as const, severity: 'warn' },
		{ errorCode: 'refunded' as const, severity: 'error' }
	])('rates a top-up that ended $errorCode as $severity', ({ errorCode, severity }) => {
		trackCyclesTopUp({
			step: 'top_up',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			tokenSymbol: 'TCYCLES',
			errorCode
		});

		expect(track).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				metadata: expect.objectContaining({ event_severity: severity })
			})
		);
	});

	it('never carries an amount or a canister', () => {
		trackCyclesTopUp({
			step: 'top_up',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
			tokenSymbol: 'TCYCLES'
		});

		const [[{ metadata }]] = track.mock.calls;

		expect(Object.keys(metadata)).toEqual([
			'event_context',
			'event_modifier',
			'source_location',
			'result_status',
			'token_symbol'
		]);
	});
});
