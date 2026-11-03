import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { trackDepositWithdraw, trackLimitOrder } from '$lib/services/trading-analytics.services';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('trading-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackLimitOrder', () => {
		it('tracks a create order with the full token / amount / price / USD block', () => {
			trackLimitOrder({
				action: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
				base: 'ICP',
				quote: 'ckUSDC',
				side: 'sell',
				orderType: 'GTC',
				baseAmount: '12.5',
				price: '8.4',
				baseUsdPrice: 8.4,
				quoteUsdPrice: 1,
				baseUsdValue: 105,
				quoteUsdValue: 105
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'limit_order',
				metadata: {
					event_context: 'trading',
					event_provider: 'OISY Trade',
					event_modifier: 'create',
					result_status: 'executing',
					token_symbol: 'ICP',
					token2_symbol: 'ckUSDC',
					side: 'sell',
					order_type: 'GTC',
					token_amount: '12.5',
					price: '8.4',
					token_usd_price: '8.4',
					token2_usd_price: '1',
					token_usd_value: '105',
					token2_usd_value: '105'
				}
			});
		});

		it('tracks a cancel order without a time-in-force and carries a sanitized error', () => {
			trackLimitOrder({
				action: 'cancel',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				base: 'ICP',
				quote: 'ckUSDC',
				side: 'buy',
				baseAmount: '3',
				price: '9',
				error: 'boom'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'limit_order',
				metadata: {
					event_context: 'trading',
					event_provider: 'OISY Trade',
					event_modifier: 'cancel',
					result_status: 'error',
					token_symbol: 'ICP',
					token2_symbol: 'ckUSDC',
					side: 'buy',
					token_amount: '3',
					price: '9',
					result_error: 'boom'
				}
			});
		});

		it('omits absent optional fields', () => {
			trackLimitOrder({
				action: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'limit_order',
				metadata: {
					event_context: 'trading',
					event_provider: 'OISY Trade',
					event_modifier: 'create',
					result_status: 'success'
				}
			});
		});

		it('omits non-finite USD fields (NaN / Infinity)', () => {
			trackLimitOrder({
				action: 'create',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				base: 'ICP',
				baseUsdPrice: NaN,
				quoteUsdPrice: Infinity,
				baseUsdValue: NaN,
				quoteUsdValue: -Infinity
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'limit_order',
				metadata: {
					event_context: 'trading',
					event_provider: 'OISY Trade',
					event_modifier: 'create',
					result_status: 'success',
					token_symbol: 'ICP'
				}
			});
		});
	});

	describe('trackDepositWithdraw', () => {
		it('tracks a deposit with token, amount and USD price / value', () => {
			trackDepositWithdraw({
				direction: 'deposit',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
				token: 'ICP',
				amount: '20',
				usdPrice: 8.4,
				usdValue: 168
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'deposit_withdraw',
				metadata: {
					event_context: 'trading',
					event_provider: 'OISY Trade',
					event_modifier: 'deposit',
					result_status: 'executing',
					token_symbol: 'ICP',
					token_amount: '20',
					token_usd_price: '8.4',
					token_usd_value: '168'
				}
			});
		});

		it('omits absent USD fields, an empty amount and an empty error on a withdraw', () => {
			trackDepositWithdraw({
				direction: 'withdraw',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				token: 'ckUSDC',
				amount: '',
				error: ''
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'deposit_withdraw',
				metadata: {
					event_context: 'trading',
					event_provider: 'OISY Trade',
					event_modifier: 'withdraw',
					result_status: 'success',
					token_symbol: 'ckUSDC'
				}
			});
		});

		it('omits non-finite USD fields (NaN / Infinity)', () => {
			trackDepositWithdraw({
				direction: 'deposit',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				token: 'ICP',
				amount: '20',
				usdPrice: NaN,
				usdValue: Infinity
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'deposit_withdraw',
				metadata: {
					event_context: 'trading',
					event_provider: 'OISY Trade',
					event_modifier: 'deposit',
					result_status: 'success',
					token_symbol: 'ICP',
					token_amount: '20'
				}
			});
		});
	});
});
