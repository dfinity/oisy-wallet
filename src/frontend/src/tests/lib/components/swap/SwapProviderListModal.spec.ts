import SwapProviderListModal from '$lib/components/swap/SwapProviderListModal.svelte';
import { SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

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
				swaps: mockSwapProviders,
				amountForSwap: '1',
				selectedProvider: mockSwapProviders[0]
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
