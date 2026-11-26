import type * as lifiEnv from '$env/rest/lifi.env';
import {
	bindLifiBtcPayout,
	hasLifiBtcPayoutBinding,
	isLifiBtcRelayOffer,
	lifiBtcAdmittedBridges,
	type LifiBtcPayoutBinding
} from '$lib/services/lifi-btc-binding.services';
import { LifiRouteUnsupportedError } from '$lib/types/errors';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { decodeLifiBtcTransaction } from '$lib/utils/lifi-swap.utils';
import { mockLifiBtcLayerswapQuote, mockLifiBtcRelayQuote } from '$tests/mocks/lifi-btc.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { ChainId, type QuoteRequestFromAmount } from '@lifi/sdk';

// All three bridges allowed from Bitcoin, `near` denied.
vi.mock('$env/rest/lifi.env', async (importOriginal) => {
	const original = await importOriginal<typeof lifiEnv>();
	const { BTC_MAINNET_NETWORK_ID: btcNetworkId } = await import('$env/networks/networks.btc.env');

	return {
		...original,
		LIFI_ALLOWED_BRIDGES: {
			...original.LIFI_ALLOWED_BRIDGES,
			[btcNetworkId]: ['layerswap', 'relaydepository', 'near']
		},
		LIFI_DENY_BRIDGES: ['near']
	};
});

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

	const { deposit, memo } = decodeLifiBtcTransaction({
		quote,
		amount: BigInt(action.fromAmount),
		userAddress: action.fromAddress ?? ''
	});

	const params = {
		quote,
		deposit,
		memo,
		request,
		displayedToAmountMin: BigInt(quote.estimate.toAmountMin)
	};

	describe('without a binding for the bridge', () => {
		it('should have one for Relay only', () => {
			expect(hasLifiBtcPayoutBinding({ tool: 'relaydepository' })).toBeTruthy();

			for (const tool of ['layerswap', 'near']) {
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

	describe('lifiBtcAdmittedBridges', () => {
		it('should admit Relay, the one allowed bridge with a binding', () => {
			expect(lifiBtcAdmittedBridges()).toEqual(['relaydepository']);
		});

		it('should admit no bridge while none has a binding, however many are allowed', () => {
			expect(lifiBtcAdmittedBridges({ bindings: {} })).toEqual([]);
		});

		it('should admit an allowed bridge with a binding, and no denied one', () => {
			const binding = vi.fn<LifiBtcPayoutBinding>();

			expect(lifiBtcAdmittedBridges({ bindings: { layerswap: binding, near: binding } })).toEqual([
				'layerswap'
			]);
		});
	});

	describe('isLifiBtcRelayOffer', () => {
		const relayOffer: SwapMappedResult = {
			provider: SwapProvider.LIFI,
			receiveAmount: 1_000_000n,
			receiveOutMinimum: 990_000n,
			swapDetails: mockLifiBtcRelayQuote,
			request: { ...request, fromChain: ChainId.BTC }
		};

		it('should spot a LI.FI route from Bitcoin through Relay', () => {
			expect(isLifiBtcRelayOffer(relayOffer)).toBeTruthy();
		});

		it('should not spot a route from Bitcoin through another bridge', () => {
			expect(
				isLifiBtcRelayOffer({ ...relayOffer, swapDetails: mockLifiBtcLayerswapQuote })
			).toBeFalsy();
		});

		// The display name is LI.FI's to choose; only the tool key says which binding runs.
		it('should not go by the display name', () => {
			expect(
				isLifiBtcRelayOffer({
					...relayOffer,
					swapDetails: {
						...mockLifiBtcLayerswapQuote,
						toolDetails: mockLifiBtcRelayQuote.toolDetails
					}
				})
			).toBeFalsy();
		});

		// From an EVM source the payout recipient is decoded from the calldata, whatever the bridge.
		it('should not spot a Relay route from another chain', () => {
			expect(
				isLifiBtcRelayOffer({ ...relayOffer, request: { ...request, fromChain: ChainId.ETH } })
			).toBeFalsy();
		});

		it('should not spot another provider, or no offer', () => {
			expect(isLifiBtcRelayOffer(mockSwapProviders[0])).toBeFalsy();
			expect(isLifiBtcRelayOffer(undefined)).toBeFalsy();
		});
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
