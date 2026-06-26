import type { UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import TradingList from '$lib/components/trading/TradingList.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { loadOisyTrade } from '$lib/services/oisy-trade.services';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { setPrivacyMode } from '$lib/utils/privacy.utils';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render } from '@testing-library/svelte';

const { enabledIcTokensMock, exchangesMock } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable: createWritable } = require('svelte/store');
	return {
		enabledIcTokensMock: createWritable([]),
		exchangesMock: createWritable({})
	};
});

vi.mock('$env/oisy-trade', () => ({ OISY_TRADE_ENABLED: true }));

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
	loadOisyTrade: vi.fn().mockResolvedValue(undefined)
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

	beforeEach(() => {
		vi.clearAllMocks();
		oisyTradeStore.reset();
		enabledIcTokensMock.set([]);
		exchangesMock.set({});
		setPrivacyMode({ enabled: false });
	});

	it('should render the onboarding when the user has no assets', () => {
		const { getByText } = render(TradingList);

		expect(getByText(en.trading.onboarding.title)).toBeInTheDocument();
	});

	it('should render the assets section when the user has assets', () => {
		enabledIcTokensMock.set([icp]);
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: undefined,
			balances: [buildBalance()]
		});

		const { getByText } = render(TradingList);

		expect(getByText(en.trading.assets.title)).toBeInTheDocument();
		expect(getByText(en.trading.text.intro)).toBeInTheDocument();
	});

	it('should poll for trade data on mount via the interval loader', () => {
		render(TradingList);

		expect(loadOisyTrade).toHaveBeenCalled();
	});
});
