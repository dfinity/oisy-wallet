import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import { initSwapAmountsStore } from '$lib/stores/swap-amounts.store';
import type { OptionAmount } from '$lib/types/send';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { get } from 'svelte/store';

const mockICPResult: SwapMappedResult = {
	provider: SwapProvider.ICP_SWAP,
	receiveAmount: 1000000000n,
	receiveOutMinimum: 990000000n,
	swapDetails: {} as SwapMappedResult
};

const mockKongResult: SwapMappedResult = {
	provider: SwapProvider.KONG_SWAP,
	receiveAmount: 2000000000n,
	slippage: 0.5,
	route: ['TokenA', 'TokenB'],
	liquidityFees: [
		{
			fee: 3000n,
			token: { symbol: 'ICP', decimals: 8 } as IcToken
		}
	],
	networkFee: {
		fee: 3000n,
		token: { symbol: 'ICP', decimals: 8 } as IcToken
	},
	swapDetails: {} as SwapAmountsReply
};

const mockAmount: OptionAmount = '100';

describe('swapAmountsStore', () => {
	const mockSwaps: SwapMappedResult[] = [mockICPResult, mockKongResult];

	it('should initialize with undefined', () => {
		const store = initSwapAmountsStore();

		expect(get(store)).toBeUndefined();
	});

	it('should set swaps with amount and selected provider', () => {
		const store = initSwapAmountsStore();
		store.setSwaps({
			swaps: mockSwaps,
			amountForSwap: mockAmount,
			selectedProvider: mockSwaps[0]
		});

		expect(get(store)).toEqual({
			swaps: mockSwaps,
			amountForSwap: mockAmount,
			selectedProvider: mockSwaps[0]
		});
	});

	it('should reset store to null', () => {
		const store = initSwapAmountsStore();
		store.setSwaps({
			swaps: mockSwaps,
			amountForSwap: mockAmount,
			selectedProvider: mockSwaps[0]
		});
		store.reset();

		expect(get(store)).toBeNull();
	});

	it('should update selected provider', () => {
		const store = initSwapAmountsStore();
		store.setSwaps({
			swaps: mockSwaps,
			amountForSwap: mockAmount,
			selectedProvider: mockSwaps[0]
		});
		store.setSelectedProvider(mockSwaps[1]);

		expect(get(store)?.selectedProvider).toEqual(mockSwaps[1]);
	});

	it('should do nothing when setSelectedProvider is called and store is null', () => {
		const store = initSwapAmountsStore();
		store.setSelectedProvider(mockSwaps[0]);

		expect(get(store)).toBeUndefined();
	});
});
