import { CanisterInternalError } from '$lib/canisters/errors';
import {
	PLAUSIBLE_EVENT_HELP_ERROR_TYPES,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENT_SUBCONTEXT_HELP
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { buildHelpEvent, toHelpErrorType, trackHelp } from '$lib/services/help-analytics.services';
import { IcpSwapPoolNotFoundError } from '$lib/services/icp-swap-recovery.services';
import { SwapProvider } from '$lib/types/swap';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('help-analytics.services', () => {
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
					token_network: 'icp',
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
					token_network: 'icp',
					token_standard: 'icrc'
				}
			});
		});

		it('tracks a failed withdrawal with the error category, never the message', () => {
			trackHelp({
				action: 'withdraw',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.ICPSWAP_WITHDRAWAL,
				token: 'ckUSDC',
				errorType: toHelpErrorType(
					new CanisterInternalError('Internal error: 1.5 ICP owed to 2vxsx-fae')
				)
			});

			const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;

			expect(metadata).toEqual(
				expect.objectContaining({
					result_status: 'error',
					token_symbol: 'ckUSDC',
					result_error_type: PLAUSIBLE_EVENT_HELP_ERROR_TYPES.CANISTER_ERROR
				})
			);

			// No field carries the canister's own text, whatever it happened to contain.
			expect(JSON.stringify(metadata)).not.toContain('1.5');
			expect(JSON.stringify(metadata)).not.toContain('2vxsx-fae');
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
				errorType: undefined
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

		it('reports an explorer click by provider and chain', () => {
			const event = buildHelpEvent({
				action: 'explorer',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				subcontext: PLAUSIBLE_EVENT_SUBCONTEXT_HELP.PROVIDER_EXPLORERS,
				provider: SwapProvider.ONE_SEC,
				network: 'icp'
			});

			expect(event).toStrictEqual({
				name: 'help',
				metadata: {
					event_context: 'help',
					event_modifier: 'explorer',
					source_location: 'help_page',
					result_status: 'success',
					event_subcontext: 'provider_explorers',
					event_provider: 'oneSec',
					event_key: 'network',
					event_value: 'icp'
				}
			});
		});

		it('omits the provider and the chain when they are not given', () => {
			const { metadata } = buildHelpEvent({
				action: 'open',
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
			});

			expect(Object.keys(metadata ?? {})).not.toContain('event_provider');
			expect(Object.keys(metadata ?? {})).not.toContain('event_key');
		});
	});

	describe('toHelpErrorType', () => {
		it('reports a missing pool', () => {
			expect(toHelpErrorType(new IcpSwapPoolNotFoundError())).toBe(
				PLAUSIBLE_EVENT_HELP_ERROR_TYPES.POOL_NOT_FOUND
			);
		});

		it('reports an error variant returned by the factory or the pool', () => {
			expect(toHelpErrorType(new CanisterInternalError('Internal error: anything'))).toBe(
				PLAUSIBLE_EVENT_HELP_ERROR_TYPES.CANISTER_ERROR
			);
		});

		it('falls back to unknown for transport and unexpected throws', () => {
			expect(toHelpErrorType(new Error('fetch failed'))).toBe(
				PLAUSIBLE_EVENT_HELP_ERROR_TYPES.UNKNOWN
			);
			expect(toHelpErrorType('a bare string')).toBe(PLAUSIBLE_EVENT_HELP_ERROR_TYPES.UNKNOWN);
			expect(toHelpErrorType(undefined)).toBe(PLAUSIBLE_EVENT_HELP_ERROR_TYPES.UNKNOWN);
		});

		it('never returns the message it was given', () => {
			// The whole point of the category: whatever ICPSwap writes cannot reach the event.
			const categories: string[] = Object.values(PLAUSIBLE_EVENT_HELP_ERROR_TYPES);

			expect(categories).toContain(
				toHelpErrorType(new CanisterInternalError('Internal error: 1.5 ICP owed to 2vxsx-fae'))
			);
		});
	});
});
