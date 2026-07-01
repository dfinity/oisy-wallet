import TradingList from '$lib/components/trading/TradingList.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { TRADING_WITHDRAW_OPEN_BUTTON } from '$lib/constants/test-ids.constants';
import { oisyTradeWithdrawTokens } from '$lib/derived/oisy-trade.derived';
import { modalStore } from '$lib/stores/modal.store';
import type { OisyTradeWithdrawToken } from '$lib/types/oisy-trade';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get, type Writable } from 'svelte/store';

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

// Expose the joined withdraw tokens as a writable so each test seeds the rows it
// needs without standing up the canister-balance → enabled-token join.
vi.mock('$lib/derived/oisy-trade.derived', async () => {
	const { writable: createWritable } = await import('svelte/store');
	return { oisyTradeWithdrawTokens: createWritable([]) };
});

describe('TradingList', () => {
	const withdrawTokensStore = oisyTradeWithdrawTokens as unknown as Writable<
		OisyTradeWithdrawToken[]
	>;

	const withdrawToken: OisyTradeWithdrawToken = {
		token: mockValidIcToken,
		free: 5_000_000n,
		reserved: ZERO
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnabled.value = true;
		withdrawTokensStore.set([withdrawToken]);
		modalStore.close();
	});

	it('renders the intro, learn-more, orders header and a withdraw trigger per holding', () => {
		const { container, getByTestId } = render(TradingList);

		expect(container).toHaveTextContent(en.trading.text.intro);
		expect(container).toHaveTextContent(en.trading.text.learn_more);
		expect(container).toHaveTextContent(en.trading.orders.title);
		expect(container).toHaveTextContent(en.trading.orders.add_limit_order);
		expect(container).toHaveTextContent(mockValidIcToken.symbol);
		expect(getByTestId(TRADING_WITHDRAW_OPEN_BUTTON)).toHaveTextContent(en.trading.withdraw.open);
	});

	it('opens the withdraw modal with the token pre-selected on click', async () => {
		const openSpy = vi.spyOn(modalStore, 'openOisyTradeWithdraw');

		const { getByTestId } = render(TradingList);

		await fireEvent.click(getByTestId(TRADING_WITHDRAW_OPEN_BUTTON));

		expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ data: withdrawToken }));
		expect(get(modalStore)?.data).toStrictEqual(withdrawToken);
	});

	it('renders no withdraw trigger when there are no holdings', () => {
		withdrawTokensStore.set([]);

		const { queryByTestId } = render(TradingList);

		expect(queryByTestId(TRADING_WITHDRAW_OPEN_BUTTON)).toBeNull();
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
