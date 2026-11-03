import LimitOrder from '$lib/components/trading/limit-order/LimitOrder.svelte';
import { modalStore } from '$lib/stores/modal.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';

const { mockLoadOrderBook, mockPlaceLimitOrder, mockPairs, mockFreeBalance, mockIcTokenBySymbol } =
	vi.hoisted(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { writable } = require('svelte/store');
		return {
			mockLoadOrderBook: vi.fn(() => Promise.resolve(undefined)),
			mockPlaceLimitOrder: vi.fn(() => Promise.resolve(undefined)),
			mockPairs: writable([]),
			mockFreeBalance: writable({}),
			mockIcTokenBySymbol: writable({})
		};
	});

vi.mock('$lib/services/oisy-trade.services', () => ({
	loadOrderBook: mockLoadOrderBook,
	placeLimitOrder: mockPlaceLimitOrder
}));

vi.mock('$lib/derived/oisy-trade.derived', () => ({
	oisyTradePairs: mockPairs,
	oisyTradeFreeBalanceBySymbol: mockFreeBalance,
	oisyTradeIcTokenBySymbol: mockIcTokenBySymbol
}));

describe('LimitOrder', () => {
	const triggerTestId = 'limit-order-trigger';

	const triggerSnippet = () =>
		createRawSnippet((open: () => () => void) => ({
			render: () => `<button data-tid="${triggerTestId}">Open</button>`,
			setup: (el) => {
				el.addEventListener('click', open());
			}
		}));

	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();
		mockPairs.set([]);
		mockFreeBalance.set({});
		mockIcTokenBySymbol.set({});
	});

	it('renders the trigger and keeps the modal closed initially', () => {
		const { getByTestId, container } = render(LimitOrder, {
			props: { trigger: triggerSnippet() }
		});

		expect(getByTestId(triggerTestId)).toBeInTheDocument();
		expect(container).not.toHaveTextContent(en.trading.limit_order.review_button);
	});

	it('opens the limit-order modal when the trigger fires open', async () => {
		const { getByTestId, container } = render(LimitOrder, {
			props: { trigger: triggerSnippet() }
		});

		await fireEvent.click(getByTestId(triggerTestId));

		expect(container).toHaveTextContent(en.trading.limit_order.review_button);
	});
});
