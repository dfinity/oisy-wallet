import TradingList from '$lib/components/trading/TradingList.svelte';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

const { mockEnabled, mockLoadOisyTrade } = vi.hoisted(() => ({
	mockEnabled: { value: true },
	mockLoadOisyTrade: vi.fn(() => Promise.resolve(undefined))
}));

vi.mock('$env/oisy-trade', () => ({
	get OISY_TRADE_ENABLED() {
		return mockEnabled.value;
	}
}));

vi.mock('$lib/services/oisy-trade.services', () => ({
	loadOisyTrade: mockLoadOisyTrade
}));

describe('TradingList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnabled.value = true;
	});

	it('renders the intro, learn-more link and orders header when trading is enabled', () => {
		const { container, getByText } = render(TradingList);

		expect(container).toHaveTextContent(en.trading.text.intro);
		expect(getByText(en.trading.text.learn_more)).toBeInTheDocument();
		expect(container).toHaveTextContent(en.trading.orders.title);
		expect(container).toHaveTextContent(en.trading.orders.add_limit_order);
	});

	it('loads the trade data on mount when enabled', async () => {
		render(TradingList);

		// IntervalLoader triggers onLoad in onMount; flush it before asserting.
		await tick();

		expect(mockLoadOisyTrade).toHaveBeenCalled();
	});

	it('renders the provider-unavailable empty state when trading is disabled', () => {
		mockEnabled.value = false;

		const { container, queryByText } = render(TradingList);

		expect(container).toHaveTextContent(en.trading.provider_unavailable.title);
		expect(queryByText(en.trading.text.intro)).toBeNull();
	});

	it('does not load the trade data when disabled', async () => {
		mockEnabled.value = false;

		render(TradingList);

		await tick();

		expect(mockLoadOisyTrade).not.toHaveBeenCalled();
	});
});
