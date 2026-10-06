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
				result_error_code: 'refunded'
			}
		});
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
