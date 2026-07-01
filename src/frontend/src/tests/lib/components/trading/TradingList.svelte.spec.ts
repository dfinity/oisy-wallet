import type { UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import TradingList from '$lib/components/trading/TradingList.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { TRADING_LIST_SKELETON } from '$lib/constants/test-ids.constants';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import { mockAuthSignedIn } from '$tests/mocks/auth.mock';
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
			balances: [buildBalance()]
		});
	};

	// Loaded (balances resolved) but empty, so the tab settles on the onboarding
	// placeholder rather than the initial-load skeleton.
	const seedLoadedEmpty = () => {
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: undefined,
			balances: []
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnabled.value = true;
		mockAuthSignedIn(false);
		oisyTradeStore.reset();
		enabledIcTokensMock.set([]);
		exchangesMock.set({});
		setPrivacyMode({ enabled: false });
	});

	it('renders the loading skeleton before the first load resolves when signed in', () => {
		mockAuthSignedIn(true);

		const { getByTestId, queryByText } = render(TradingList);

		expect(getByTestId(TRADING_LIST_SKELETON)).toBeInTheDocument();
		expect(queryByText(en.trading.onboarding.title)).toBeNull();
	});

	it('renders the onboarding (not the skeleton) when signed out, since no load populates the store', () => {
		const { getByText, queryByTestId } = render(TradingList);

		expect(getByText(en.trading.onboarding.title)).toBeInTheDocument();
		expect(queryByTestId(TRADING_LIST_SKELETON)).toBeNull();
	});

	it('should render the onboarding when the user has no assets', () => {
		seedLoadedEmpty();

		const { getByText, queryByTestId } = render(TradingList);

		expect(getByText(en.trading.onboarding.title)).toBeInTheDocument();
		expect(queryByTestId(TRADING_LIST_SKELETON)).toBeNull();
	});

	it('renders the assets section, intro, learn-more and orders header once the user has assets', () => {
		seedAssets();

		const { container, getByText } = render(TradingList);

		expect(getByText(en.trading.assets.title)).toBeInTheDocument();
		expect(container).toHaveTextContent(en.trading.text.intro);
		expect(container).toHaveTextContent(en.trading.text.learn_more);
		expect(container).toHaveTextContent(en.trading.orders.title);
		expect(container).toHaveTextContent(en.trading.orders.add_limit_order);
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
