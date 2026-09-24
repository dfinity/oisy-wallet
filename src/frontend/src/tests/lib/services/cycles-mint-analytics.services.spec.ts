import { PLAUSIBLE_EVENT_RESULT_STATUSES, PLAUSIBLE_EVENTS } from '$lib/enums/plausible';
import * as analytics from '$lib/services/analytics.services';
import { trackCyclesMint } from '$lib/services/cycles-mint-analytics.services';
import type { MockInstance } from 'vitest';

describe('trackCyclesMint', () => {
	let track: MockInstance;

	beforeEach(() => {
		vi.restoreAllMocks();
		track = vi.spyOn(analytics, 'trackEvent').mockImplementation(() => undefined);
	});

	it('emits one event for every step, with the step as a modifier', () => {
		trackCyclesMint({ step: 'open' });
		trackCyclesMint({ step: 'mint', resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING });

		expect(track.mock.calls.map(([{ name }]) => name)).toEqual([
			PLAUSIBLE_EVENTS.CYCLES_MINT,
			PLAUSIBLE_EVENTS.CYCLES_MINT
		]);
		expect(track.mock.calls.map(([{ metadata }]) => metadata?.event_modifier)).toEqual([
			'open',
			'mint'
		]);
	});

	it('carries only the context and source for an open', () => {
		trackCyclesMint({ step: 'open' });

		expect(track).toHaveBeenCalledExactlyOnceWith({
			name: PLAUSIBLE_EVENTS.CYCLES_MINT,
			metadata: {
				event_context: 'compute',
				event_modifier: 'open',
				source_location: 'token_details'
			}
		});
	});

	it('maps both tokens onto the token and token2 fields', () => {
		trackCyclesMint({
			step: 'mint',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
			sourceSymbol: 'ICP',
			sourceAmount: '1.5',
			sourceUsdValue: '4.5',
			destinationSymbol: 'TCYCLES',
			destinationAmount: '4.4999'
		});

		expect(track).toHaveBeenCalledExactlyOnceWith({
			name: PLAUSIBLE_EVENTS.CYCLES_MINT,
			metadata: {
				event_context: 'compute',
				event_modifier: 'mint',
				source_location: 'token_details',
				result_status: 'success',
				token_symbol: 'ICP',
				token_amount: '1.5',
				token_usd_value: '4.5',
				token2_symbol: 'TCYCLES',
				token2_amount: '4.4999'
			}
		});
	});

	it('reports why a mint failed as an error code', () => {
		trackCyclesMint({
			step: 'mint',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
			errorCode: 'refunded'
		});

		const [[{ metadata }]] = track.mock.calls;

		expect(metadata?.result_status).toBe('error');
		expect(metadata?.result_error_code).toBe('refunded');
	});

	it('omits the fields it was not given', () => {
		trackCyclesMint({ step: 'mint', sourceSymbol: '', destinationAmount: '' });

		const [[{ metadata }]] = track.mock.calls;

		expect(Object.keys(metadata ?? {})).toEqual([
			'event_context',
			'event_modifier',
			'source_location'
		]);
	});
});
