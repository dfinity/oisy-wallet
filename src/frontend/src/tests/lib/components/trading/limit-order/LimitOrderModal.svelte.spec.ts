import LimitOrderModal from '$lib/components/trading/limit-order/LimitOrderModal.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

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

describe('LimitOrderModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockPairs.set([]);
		mockFreeBalance.set({});
		mockIcTokenBySymbol.set({});
	});

	it('mounts the wizard modal on the form step', () => {
		const { container } = render(LimitOrderModal);

		// The form step renders the review button inside the wizard.
		expect(container).toHaveTextContent(en.trading.limit_order.review_button);
	});

	it('renders the limit-order title for the initial form step', () => {
		const { container } = render(LimitOrderModal);

		expect(container).toHaveTextContent(en.trading.limit_order.title);
	});
});
