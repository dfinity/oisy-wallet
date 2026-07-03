import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SUBCONTEXT_TRADING
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { trackTrading } from '$lib/services/trading-analytics.services';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('trading-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackTrading', () => {
		it('tracks a single trading event with context, subcontext and result status', () => {
			trackTrading({
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.LIMIT_ORDER,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
				base: 'ICP',
				quote: 'ckUSDC',
				side: 'sell',
				orderType: 'GTC',
				volume: '12.5'
			});

			// `base`/`quote` params map onto the swap-style `token`/`token2` metadata keys.
			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'trading',
				metadata: {
					dApp: 'OISY TRADE',
					event_context: 'trading',
					event_subcontext: 'limit_order',
					result_status: 'executing',
					token: 'ICP',
					token2: 'ckUSDC',
					side: 'sell',
					orderType: 'GTC',
					volume: '12.5'
				}
			});
		});

		it('carries a token and a sanitized error on failures', () => {
			trackTrading({
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.DEPOSIT,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				token: 'ICP',
				error: 'boom'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'trading',
				metadata: {
					dApp: 'OISY TRADE',
					event_context: 'trading',
					event_subcontext: 'deposit',
					result_status: 'error',
					token: 'ICP',
					result_error: 'boom'
				}
			});
		});

		it('omits absent optional fields, an empty volume and an empty error', () => {
			trackTrading({
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.WITHDRAW,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				token: 'ckUSDC',
				volume: '',
				error: ''
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'trading',
				metadata: {
					dApp: 'OISY TRADE',
					event_context: 'trading',
					event_subcontext: 'withdraw',
					result_status: 'success',
					token: 'ckUSDC'
				}
			});
		});
	});
});
