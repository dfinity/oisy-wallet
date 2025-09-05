import SwapProviderListModal from '$lib/components/swap/SwapProviderListModal.svelte';
import * as ExchangeDerived from '$lib/derived/exchange.derived';
import { SWAP_AMOUNTS_CONTEXT_KEY } from '$lib/stores/swap-amounts.store';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import type { ExchangesData } from '$lib/types/exchange';
import { mockValidIcCkToken, mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockSwapProviders } from '$tests/mocks/swap.mocks';
import { queryAllByTestId, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { derived, readable, writable } from 'svelte/store';

vi.mock('$env/dapp-descriptions.env', () => ({
	dAppDescriptions: [
		{
			id: 'kongswap',
			name: 'Kong Swap',
			logo: 'https://example.com/logo.png',
			website: 'https://kongswap.com'
		},
		{
			id: 'icpswap',
			name: 'ICP Swap',
			logo: 'https://example.com/icpswap-logo.png',
			website: 'https://icpswap.com'
		}
	]
}));

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

	it('recalculates USD value when destinationTokenExchangeRate changes', async () => {
		const dynamicRate = writable(2);

		const context = new Map();
		context.set(SWAP_CONTEXT_KEY, {
			destinationToken: readable(mockValidIcToken),
			destinationTokenExchangeRate: dynamicRate
		});

		context.set(SWAP_AMOUNTS_CONTEXT_KEY, {
			store: readable({
				swaps: mockSwapProviders,
				amountForSwap: '1',
				selectedProvider: mockSwapProviders[0]
			})
		});

		const { getAllByText, queryAllByText } = render(SwapProviderListModal, { context });

		await tick();

		expect(getAllByText('$20.00')).toHaveLength(1);
		expect(getAllByText('$40.00')).toHaveLength(1);

		dynamicRate.set(4);
		await tick();

		expect(queryAllByText('$40.00')).toHaveLength(1);
		expect(queryAllByText('$80.00')).toHaveLength(1);
	});

	it('recalculates USD value when undefined destinationTokenExchangeRate changes', async () => {
		const dynamicRate = writable(undefined);

		const context = new Map();
		context.set(SWAP_CONTEXT_KEY, {
			destinationToken: readable(mockValidIcToken),
			destinationTokenExchangeRate: dynamicRate
		});

		context.set(SWAP_AMOUNTS_CONTEXT_KEY, {
			store: readable({
				swaps: mockSwapProviders,
				amountForSwap: '1',
				selectedProvider: mockSwapProviders[0]
			})
		});

		const { container } = render(SwapProviderListModal, { context });

		await tick();

		expect(queryAllByTestId(container, 'provider-item')).toHaveLength(0);
	});

	it('updates when exchanges store changes', async () => {
		const tokenId = mockValidIcToken.id;
		const mockExchanges = writable<ExchangesData>({
			[tokenId]: { usd: 2 }
		});
		vi.spyOn(ExchangeDerived, 'exchanges', 'get').mockReturnValue(mockExchanges);

		const context = new Map();
		context.set(SWAP_CONTEXT_KEY, {
			destinationToken: readable(mockValidIcToken),
			destinationTokenExchangeRate: derived(mockExchanges, ($exchange) => $exchange?.[tokenId]?.usd)
		});
		context.set(SWAP_AMOUNTS_CONTEXT_KEY, {
			store: readable({
				swaps: mockSwapProviders,
				amountForSwap: '1',
				selectedProvider: mockSwapProviders[0]
			})
		});

		const { getByText } = render(SwapProviderListModal, { context });

		await tick();

		expect(getByText('$20.00')).toBeInTheDocument();

		mockExchanges.set({
			[tokenId]: { usd: 3 }
		});
		await tick();

		expect(getByText('$30.00')).toBeInTheDocument();
	});
});
