import type { SwapAmountsReply } from '$declarations/kong_backend/kong_backend.did';
import type { IcToken } from '$icp/types/ic-token';
import SwapProviderListModal from '$lib/components/swap/SwapProviderListModal.svelte';
import { SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { SwapProvider, type SwapMappedResult } from '$lib/types/swap';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

const MOCK_PROVIDERS: SwapMappedResult[] = [
	{
		provider: SwapProvider.ICP_SWAP,
		receiveAmount: 1000000000n,
		receiveOutMinimum: 990000000n,
		swapDetails: {} as SwapMappedResult
	},
	{
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
	}
];

describe('SwapProviderListModal', () => {
	let mockContext: Map<symbol, unknown>;

	beforeEach(() => {
		mockContext = new Map();

		mockContext.set(SWAP_CONTEXT_KEY, {
			destinationToken: readable(mockValidIcCkToken),
			destinationTokenExchangeRate: readable(0.00002)
		});

		mockContext.set(SWAP_AMOUNTS_CONTEXT_KEY, {
			store: readable({
				swaps: MOCK_PROVIDERS,
				amountForSwap: '1',
				selectedProvider: MOCK_PROVIDERS[0]
			})
		});
	});

	it('renders all provider modal titles', () => {
		const { getByText } = render(SwapProviderListModal, {
			context: mockContext
		});

		expect(getByText('Swap provider')).toBeInTheDocument();
		expect(getByText('You receive')).toBeInTheDocument();
	});

	it('renders all provider rows with USD values', () => {
		const { getAllByText } = render(SwapProviderListModal, {
			context: mockContext
		});

		expect(getAllByText(/\$\d+\.\d{2}/)).toHaveLength(2);
	});
});
