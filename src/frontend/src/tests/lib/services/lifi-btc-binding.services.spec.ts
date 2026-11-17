import {
	bindLifiBtcPayout,
	hasLifiBtcPayoutBinding,
	type LifiBtcPayoutBinding
} from '$lib/services/lifi-btc-binding.services';
import { LifiRouteUnsupportedError } from '$lib/types/errors';
import { decodeLifiBtcTransaction } from '$lib/utils/lifi-swap.utils';
import { mockLifiBtcLayerswapQuote } from '$tests/mocks/lifi-btc.mock';
import { ChainId, type QuoteRequestFromAmount } from '@lifi/sdk';

describe('lifi-btc-binding.services', () => {
	const quote = mockLifiBtcLayerswapQuote;
	const { action } = quote;

	const request: QuoteRequestFromAmount = {
		fromChain: ChainId.BTC,
		toChain: action.toChainId,
		fromToken: 'bitcoin',
		toToken: action.toToken.address,
		fromAddress: action.fromAddress ?? '',
		toAddress: action.toAddress,
		fromAmount: action.fromAmount,
		slippage: 0.005
	};

	const { deposit } = decodeLifiBtcTransaction({
		quote,
		amount: BigInt(action.fromAmount),
		userAddress: action.fromAddress ?? ''
	});

	const params = {
		quote,
		deposit,
		request,
		displayedToAmountMin: BigInt(quote.estimate.toAmountMin)
	};

	describe('without a binding for the bridge', () => {
		it('should have none for any bridge yet', () => {
			for (const tool of ['layerswap', 'relaydepository', 'near']) {
				expect(hasLifiBtcPayoutBinding({ tool })).toBeFalsy();
			}
		});

		it('should refuse the route', async () => {
			const refusal = bindLifiBtcPayout(params);

			await expect(refusal).rejects.toBeInstanceOf(LifiRouteUnsupportedError);
			await expect(refusal).rejects.toThrow(
				"LI.FI's route from Bitcoin via layerswap has no payout binding"
			);
			await expect(refusal).rejects.toHaveProperty('route', quote);
		});

		// A tool key comes from LI.FI's response, so it must not reach the registry's prototype.
		it.each(['constructor', 'toString', '__proto__'])(
			'should not take the inherited %s for a binding',
			async (tool) => {
				expect(hasLifiBtcPayoutBinding({ tool, bindings: {} })).toBeFalsy();

				await expect(
					bindLifiBtcPayout({ ...params, quote: { ...quote, tool }, bindings: {} })
				).rejects.toBeInstanceOf(LifiRouteUnsupportedError);
			}
		);
	});

	describe("with the bridge's binding", () => {
		const binding = vi.fn<LifiBtcPayoutBinding>();
		const bindings = { layerswap: binding };

		beforeEach(() => {
			binding.mockReset();
		});

		it('should report it', () => {
			expect(hasLifiBtcPayoutBinding({ tool: 'layerswap', bindings })).toBeTruthy();
		});

		it('should run it with the deposit, the request and the displayed minimum', async () => {
			binding.mockResolvedValue(undefined);

			await bindLifiBtcPayout({ ...params, bindings });

			expect(binding).toHaveBeenCalledExactlyOnceWith(params);
		});

		it('should reject with its refusal', async () => {
			const refusal = new Error('the record pays someone else');
			binding.mockRejectedValue(refusal);

			await expect(bindLifiBtcPayout({ ...params, bindings })).rejects.toBe(refusal);
		});

		it("should not run another bridge's binding", async () => {
			await expect(
				bindLifiBtcPayout({ ...params, quote: { ...quote, tool: 'near' }, bindings })
			).rejects.toBeInstanceOf(LifiRouteUnsupportedError);

			expect(binding).not.toHaveBeenCalled();
		});
	});
});
