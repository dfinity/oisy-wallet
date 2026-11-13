import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import type * as lifiEnv from '$env/rest/lifi.env';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import { requoteAtLeast } from '$lib/services/lifi-swap-execution.services';
import { LifiRouteUnsupportedError } from '$lib/types/errors';
import { mockLifiBtcLayerswapQuote } from '$tests/mocks/lifi-btc.mock';
import { mockLifiQuote } from '$tests/mocks/lifi.mock';
import { ChainId, type QuoteRequestFromAmount } from '@lifi/sdk';

// No bridge is admitted from Bitcoin yet; LayerSwap stands in for the first.
vi.mock('$env/rest/lifi.env', async (importOriginal) => {
	const original = await importOriginal<typeof lifiEnv>();
	const { BTC_MAINNET_NETWORK_ID: btcNetworkId } = await import('$env/networks/networks.btc.env');

	return {
		...original,
		LIFI_ALLOWED_BRIDGES: { ...original.LIFI_ALLOWED_BRIDGES, [btcNetworkId]: ['layerswap'] }
	};
});

vi.mock('$lib/rest/lifi.rest', () => ({
	fetchLifiQuote: vi.fn()
}));

describe('lifi-swap-execution.services', () => {
	describe('requoteAtLeast', () => {
		describe('a BTC source', () => {
			const { action } = mockLifiBtcLayerswapQuote;

			const request: QuoteRequestFromAmount = {
				fromChain: ChainId.BTC,
				toChain: action.toChainId,
				fromToken: 'bitcoin',
				toToken: action.toToken.address,
				fromAddress: action.fromAddress ?? '',
				toAddress: action.toAddress,
				fromAmount: action.fromAmount,
				slippage: 0.005,
				allowBridges: ['layerswap']
			};

			const displayedToAmountMin = BigInt(mockLifiBtcLayerswapQuote.estimate.toAmountMin);

			beforeEach(() => {
				vi.mocked(fetchLifiQuote).mockResolvedValue(mockLifiBtcLayerswapQuote);
			});

			it('should accept a route through an admitted bridge without an EVM facet', async () => {
				await expect(
					requoteAtLeast({ request, sourceNetworkId: BTC_MAINNET_NETWORK_ID, displayedToAmountMin })
				).resolves.toBe(mockLifiBtcLayerswapQuote);
			});

			it('should refuse a route with a swap after the bridge', async () => {
				vi.mocked(fetchLifiQuote).mockResolvedValue({
					...mockLifiBtcLayerswapQuote,
					includedSteps: [
						...mockLifiBtcLayerswapQuote.includedSteps,
						{ ...mockLifiQuote, type: 'swap', tool: 'kyberswap' }
					]
				});

				await expect(
					requoteAtLeast({ request, sourceNetworkId: BTC_MAINNET_NETWORK_ID, displayedToAmountMin })
				).rejects.toThrow(LifiRouteUnsupportedError);
			});

			it('should abort as slippage when the minimum fell below the one displayed', async () => {
				await expect(
					requoteAtLeast({
						request,
						sourceNetworkId: BTC_MAINNET_NETWORK_ID,
						displayedToAmountMin: displayedToAmountMin + 1n
					})
				).rejects.toThrow('Slippage exceeded.');
			});
		});
	});
});
