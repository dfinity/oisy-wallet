import {
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SUBCONTEXT_HELP
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { buildHelpEvent, trackHelp } from '$lib/services/help-analytics.services';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('support-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackHelp', () => {
		it('tracks the page open with no subcontext', () => {
			trackHelp({
				action: 'open',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'help',
				metadata: {
					event_context: 'help',
					event_modifier: 'open',
					source_location: 'help_page',
					result_status: 'success'
				}
			});
		});

		it('tracks a help-link click with the destination URL', () => {
			trackHelp({
				action: 'contact',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.SUPPORT,
				link: 'https://support.example.org'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'help',
				metadata: {
					event_context: 'help',
					event_modifier: 'contact',
					source_location: 'help_page',
					result_status: 'success',
					event_subcontext: 'support',
					event_key: 'link',
					event_value: 'https://support.example.org'
				}
			});
		});

		it('tracks a scan with the pools checked and the rows found', () => {
			trackHelp({
				action: 'scan',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				balancesFound: 3,
				poolsScanned: 9
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'help',
				metadata: {
					event_context: 'help',
					event_modifier: 'scan',
					source_location: 'help_page',
					result_status: 'success',
					event_subcontext: 'icpswap_withdrawal',
					event_key: 'balances_found',
					event_value: '3',
					source_detail: '9'
				}
			});
		});

		it('tracks a resolved pool with both leg symbols and the withdrawable count', () => {
			trackHelp({
				action: 'select_pool',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: 'ICP',
				token2: 'ckUSDC',
				balancesFound: 2
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'help',
				metadata: {
					event_context: 'help',
					event_modifier: 'select_pool',
					source_location: 'help_page',
					result_status: 'success',
					event_subcontext: 'icpswap_withdrawal',
					token_symbol: 'ICP',
					token2_symbol: 'ckUSDC',
					event_key: 'balances_found',
					event_value: '2'
				}
			});
		});

		it('tracks a zero-balance pool, keeping the count rather than omitting it', () => {
			trackHelp({
				action: 'select_pool',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: 'ICP',
				token2: 'ckUSDC',
				balancesFound: 0
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						event_key: 'balances_found',
						event_value: '0'
					})
				})
			);
		});

		it('tracks a withdrawal with the token symbol and standard', () => {
			trackHelp({
				action: 'withdraw',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: 'ICP',
				tokenStandard: 'icrc'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: 'help',
				metadata: {
					event_context: 'help',
					event_modifier: 'withdraw',
					source_location: 'help_page',
					result_status: 'executing',
					event_subcontext: 'icpswap_withdrawal',
					token_symbol: 'ICP',
					token_standard: 'icrc'
				}
			});
		});

		it('tracks a failed withdrawal with the sanitized error', () => {
			trackHelp({
				action: 'withdraw',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: 'ckUSDC',
				error: 'Internal error: pool unavailable'
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						result_status: 'error',
						token_symbol: 'ckUSDC',
						result_error: 'Internal error: pool unavailable'
					})
				})
			);
		});

		it('omits every optional field rather than sending it as undefined', () => {
			trackHelp({
				action: 'open',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: undefined,
				token: undefined,
				token2: undefined,
				tokenStandard: undefined,
				balancesFound: undefined,
				poolsScanned: undefined,
				link: undefined,
				error: undefined
			});

			const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;

			expect(Object.keys(metadata ?? {})).toStrictEqual([
				'event_context',
				'event_modifier',
				'source_location',
				'result_status'
			]);
		});

		it('never emits an amount, a USD value or a principal', () => {
			trackHelp({
				action: 'withdraw',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: 'ICP',
				tokenStandard: 'icrc'
			});

			const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;
			const keys = Object.keys(metadata ?? {});

			expect(keys).not.toContain('token_amount');
			expect(keys).not.toContain('token_usd_value');
			expect(keys).not.toContain('token_usd_price');
			expect(keys).not.toContain('token2_amount');
			expect(keys).not.toContain('principal');
		});
	});

	describe('buildHelpEvent', () => {
		it('returns the payload without firing it', () => {
			const event = buildHelpEvent({
				action: 'contact',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.SUPPORT,
				link: 'https://support.example.org'
			});

			expect(event).toStrictEqual({
				name: 'help',
				metadata: {
					event_context: 'help',
					event_modifier: 'contact',
					source_location: 'help_page',
					result_status: 'success',
					event_subcontext: 'support',
					event_key: 'link',
					event_value: 'https://support.example.org'
				}
			});
			expect(trackEvent).not.toHaveBeenCalled();
		});
	});
});
