import { USDC_TOKEN as BASE_USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens-erc20/tokens.usdc.env';
import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { USDC_TOKEN as SOLANA_USDC_TOKEN } from '$env/tokens/tokens-spl/tokens.usdc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { trackSwapReceiveShortcut } from '$lib/services/swap-receive-shortcut-analytics.services';
import { parseTokenId } from '$lib/validation/token.validation';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('swap-receive-shortcut-analytics.services', () => {
	const payToken = {
		token_symbol: BASE_USDC_TOKEN.symbol,
		token_network: BASE_USDC_TOKEN.network.name,
		token_name: BASE_USDC_TOKEN.name,
		token_standard: BASE_USDC_TOKEN.standard.code,
		token_address: BASE_USDC_TOKEN.address.toLowerCase()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackSwapReceiveShortcut', () => {
		// The exact metadata: the pay token is public chain data, and no amount is sent.
		it.each(['same_network', 'any_token'] as const)(
			'should track the use of %s with the pay token only',
			(action) => {
				trackSwapReceiveShortcut({ action, sourceToken: BASE_USDC_TOKEN });

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: PLAUSIBLE_EVENTS.SWAP_RECEIVE_SHORTCUT,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
						event_modifier: action,
						...payToken,
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
					}
				});
			}
		);

		it('should add the picked receive token', () => {
			trackSwapReceiveShortcut({
				action: 'other_network',
				sourceToken: BASE_USDC_TOKEN,
				destinationToken: SOLANA_USDC_TOKEN
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: PLAUSIBLE_EVENTS.SWAP_RECEIVE_SHORTCUT,
				metadata: {
					event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
					event_modifier: 'other_network',
					...payToken,
					token2_symbol: SOLANA_USDC_TOKEN.symbol,
					token2_network: SOLANA_USDC_TOKEN.network.name,
					token2_name: SOLANA_USDC_TOKEN.name,
					token2_standard: SOLANA_USDC_TOKEN.standard.code,
					token2_address: SOLANA_USDC_TOKEN.address,
					result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
				}
			});
		});

		it('distinguishes two contracts with the same ticker and name', () => {
			const otherContract = {
				...BASE_USDC_TOKEN,
				id: parseTokenId(BASE_USDC_TOKEN.symbol),
				address: '0x00000000000000000000000000000000000000AB'
			};

			trackSwapReceiveShortcut({ action: 'any_token', sourceToken: BASE_USDC_TOKEN });
			trackSwapReceiveShortcut({ action: 'any_token', sourceToken: otherContract });

			expect(
				vi.mocked(trackEvent).mock.calls.map(([{ metadata }]) => metadata?.token_address)
			).toEqual([BASE_USDC_TOKEN.address.toLowerCase(), otherContract.address.toLowerCase()]);
		});

		it('uses the symbol and network for native tokens with no address', () => {
			trackSwapReceiveShortcut({
				action: 'other_network',
				sourceToken: ETHEREUM_TOKEN,
				destinationToken: BASE_ETH_TOKEN
			});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: PLAUSIBLE_EVENTS.SWAP_RECEIVE_SHORTCUT,
				metadata: {
					event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
					event_modifier: 'other_network',
					token_symbol: ETHEREUM_TOKEN.symbol,
					token_network: ETHEREUM_TOKEN.network.name,
					token_name: ETHEREUM_TOKEN.name,
					token_standard: ETHEREUM_TOKEN.standard.code,
					token2_symbol: BASE_ETH_TOKEN.symbol,
					token2_network: BASE_ETH_TOKEN.network.name,
					token2_name: BASE_ETH_TOKEN.name,
					token2_standard: BASE_ETH_TOKEN.standard.code,
					result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
				}
			});
		});
	});
});
