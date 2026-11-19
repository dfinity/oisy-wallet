import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import type * as lifiEnv from '$env/rest/lifi.env';
import { fetchLifiQuote } from '$lib/rest/lifi.rest';
import { requoteAtLeast } from '$lib/services/lifi-swap-execution.services';
import { LifiRouteUnsupportedError } from '$lib/types/errors';
import { mockLifiBtcLayerswapQuote } from '$tests/mocks/lifi-btc.mock';
import { mockLifiQuote } from '$tests/mocks/lifi.mock';
import { ChainId, HTTPError, SDKError, type QuoteRequestFromAmount } from '@lifi/sdk';

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

			// As the SDK throws it: with LI.FI's own error code read from the body.
			const lifiFailure = ({ status, code }: { status: number; code: number }) =>
				new SDKError(
					Object.assign(
						new HTTPError(new Response('{}', { status }), 'https://li.quest/v1/quote', {}),
						{ responseBody: { code, message: '' } }
					)
				);

			// Missing or too small UTXOs come with the statuses of "no route", but no slippage would help.
			it.each([
				{ case: 'no UTXOs', status: 404, code: 1003 },
				{ case: 'UTXOs too small', status: 422, code: 1004 }
			])('should rethrow LI.FI refusing the balance ($case) as is', async ({ status, code }) => {
				const err = lifiFailure({ status, code });

				vi.mocked(fetchLifiQuote).mockRejectedValue(err);

				await expect(
					requoteAtLeast({ request, sourceNetworkId: BTC_MAINNET_NETWORK_ID, displayedToAmountMin })
				).rejects.toBe(err);
			});

			it('should abort as slippage when no route is left', async () => {
				vi.mocked(fetchLifiQuote).mockRejectedValue(lifiFailure({ status: 404, code: 1002 }));

				await expect(
					requoteAtLeast({ request, sourceNetworkId: BTC_MAINNET_NETWORK_ID, displayedToAmountMin })
				).rejects.toThrow('Slippage exceeded. LI.FI no longer has a route for the swap.');
			});
		});

		// The balance codes are LI.FI's BTC ones: from another chain a 404 is no route, whatever its code.
		it('should abort as slippage on a 404 with code 1003 from an EVM source', async () => {
			vi.mocked(fetchLifiQuote).mockRejectedValue(
				new SDKError(
					Object.assign(
						new HTTPError(new Response('{}', { status: 404 }), 'https://li.quest/v1/quote', {}),
						{ responseBody: { code: 1003, message: '' } }
					)
				)
			);

			await expect(
				requoteAtLeast({
					request: {
						fromChain: ChainId.ETH,
						toChain: ChainId.BAS,
						fromToken: mockLifiQuote.action.fromToken.address,
						toToken: mockLifiQuote.action.toToken.address,
						fromAddress: mockLifiQuote.action.fromAddress ?? '',
						fromAmount: mockLifiQuote.action.fromAmount
					},
					sourceNetworkId: BTC_MAINNET_NETWORK_ID,
					displayedToAmountMin: 1n
				})
			).rejects.toThrow('Slippage exceeded. LI.FI no longer has a route for the swap.');
		});
	});
});
