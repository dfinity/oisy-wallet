import type { UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import TradingList from '$lib/components/trading/TradingList.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { TRADING_GOTO_BUTTON } from '$lib/constants/test-ids.constants';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

const { enabledIcTokensMock, exchangesMock, mockEnabled, mockLoadOisyTrade } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable: createWritable } = require('svelte/store');
	return {
		enabledIcTokensMock: createWritable([]),
		exchangesMock: createWritable({}),
		mockEnabled: { value: true },
		mockLoadOisyTrade: vi.fn(() => Promise.resolve(undefined))
	};
});

vi.mock('$env/oisy-trade', () => ({
	get OISY_TRADE_ENABLED() {
		return mockEnabled.value;
	}
}));

vi.mock(import('$lib/derived/tokens.derived'), async (importOriginal) => ({
	...(await importOriginal()),
	get enabledIcTokens() {
		return enabledIcTokensMock;
	}
}));

vi.mock(import('$lib/derived/exchange.derived'), async (importOriginal) => ({
	...(await importOriginal()),
	get exchanges() {
		return exchangesMock;
	}
}));

vi.mock('$lib/services/oisy-trade.services', () => ({
	loadOisyTrade: mockLoadOisyTrade
}));

const LEDGER_ICP = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

const buildBalance = (): UserTokenBalance =>
	({
		token: { id: { ledger_id: Principal.fromText(LEDGER_ICP) } },
		balance: { free: 100000000n, reserved: ZERO }
	}) as unknown as UserTokenBalance;

describe('TradingList', () => {
	const icp: IcToken = {
		...mockValidIcToken,
		ledgerCanisterId: LEDGER_ICP,
		symbol: 'ICP',
		decimals: 8
	};

	const seedAssets = () => {
		enabledIcTokensMock.set([icp]);
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: undefined,
			balances: [buildBalance()],
			orders: undefined
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnabled.value = true;
		oisyTradeStore.reset();
		enabledIcTokensMock.set([]);
		exchangesMock.set({});
		setPrivacyMode({ enabled: false });
	});

	it('should render the empty placeholder when the user has no assets', () => {
		// Loaded (balances non-null) but empty → the empty placeholder rather than the skeleton.
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: undefined,
			balances: [],
			orders: undefined
		});

		const { getByText, queryByTestId } = render(TradingList);

		expect(getByText(en.trading.text.no_trades)).toBeInTheDocument();
		// The go-to-trade button now lives in the Assets footer, not the list itself.
		expect(queryByTestId(TRADING_GOTO_BUTTON)).toBeNull();
	});

	it('renders only the assets section once the user has assets', () => {
		seedAssets();

		const { container, getByText } = render(TradingList);

		expect(getByText(en.trading.assets.title)).toBeInTheDocument();
		// Intro, learn-more and orders now live on the standalone Trade page.
		expect(container).not.toHaveTextContent(en.trading.text.intro);
		expect(container).not.toHaveTextContent(en.trading.orders.title);
	});

	it('loads the trade data on mount via the interval loader', async () => {
		render(TradingList);

		// IntervalLoader triggers onLoad in onMount; flush it before asserting.
		await tick();

		expect(mockLoadOisyTrade).toHaveBeenCalled();
	});

	it('renders the provider-unavailable empty state when trading is disabled', () => {
		mockEnabled.value = false;

		const { container, queryByText } = render(TradingList);

		expect(container).toHaveTextContent(en.trading.provider_unavailable.title);
		expect(queryByText(en.trading.onboarding.title)).toBeNull();
	});

	it('does not load the trade data when disabled', async () => {
		mockEnabled.value = false;

		render(TradingList);

		await tick();

		expect(mockLoadOisyTrade).not.toHaveBeenCalled();
	});
});
