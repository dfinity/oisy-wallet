import { NVDA_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.nvda.env';
import { USDG_TOKEN } from '$env/tokens/tokens-evm/tokens-robinhood/tokens-erc20/tokens.usdg.env';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_EVENTS_KEYS,
	PLAUSIBLE_EVENT_RESULT_STATUSES,
	PLAUSIBLE_EVENTS
} from '$lib/enums/plausible';
import { trackEvent } from '$lib/services/analytics.services';
import { trackSwapTwoSwapsHint } from '$lib/services/swap-two-swaps-hint-analytics.services';
import { SwapProvider } from '$lib/types/swap';
import { mockLifiBaseUsdcToken } from '$tests/mocks/lifi.mock';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('swap-two-swaps-hint-analytics.services', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trackSwapTwoSwapsHint', () => {
		// The exact metadata: the pair and the in-between token are public chain data, and no amount
		// is sent.
		it.each(['show', 'click'] as const)(
			'should track the %s of the hint with the pair and the in-between token',
			(action) => {
				trackSwapTwoSwapsHint({
					action,
					provider: SwapProvider.LIFI,
					sourceToken: mockLifiBaseUsdcToken,
					destinationToken: NVDA_TOKEN,
					intermediateToken: USDG_TOKEN
				});

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: PLAUSIBLE_EVENTS.SWAP_TWO_SWAPS_HINT,
					metadata: {
						event_context: PLAUSIBLE_EVENT_CONTEXTS.TOKENS,
						event_provider: SwapProvider.LIFI,
						event_modifier: action,
						event_key: PLAUSIBLE_EVENT_EVENTS_KEYS.TOKEN,
						event_value: USDG_TOKEN.symbol,
						event_key2: PLAUSIBLE_EVENT_EVENTS_KEYS.NETWORK,
						event_value2: USDG_TOKEN.network.name,
						token_symbol: mockLifiBaseUsdcToken.symbol,
						token_network: mockLifiBaseUsdcToken.network.name,
						token_name: mockLifiBaseUsdcToken.name,
						token_standard: mockLifiBaseUsdcToken.standard.code,
						token_id: String(mockLifiBaseUsdcToken.id),
						token2_symbol: NVDA_TOKEN.symbol,
						token2_network: NVDA_TOKEN.network.name,
						token2_name: NVDA_TOKEN.name,
						token2_standard: NVDA_TOKEN.standard.code,
						token2_id: String(NVDA_TOKEN.id),
						result_status: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
					}
				});
			}
		);
	});
});
