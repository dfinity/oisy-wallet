import type {
	Token as OisyTradeToken,
	TradingPairInfo
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import TradingDepositModal from '$lib/components/trading/TradingDepositModal.svelte';
import { balancesStore } from '$lib/stores/balances.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
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

const LEDGER_ICP = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

const supportedToken = (): OisyTradeToken =>
	({
		id: { ledger_id: Principal.fromText(LEDGER_ICP) },
		metadata: { symbol: 'ICP', decimals: 8 }
	}) as unknown as OisyTradeToken;

const buildPair = ({ base, quote }: { base: string; quote: string }): TradingPairInfo =>
	({
		base: { metadata: { symbol: base } },
		quote: { metadata: { symbol: quote } }
	}) as unknown as TradingPairInfo;

describe('TradingDepositModal', () => {
	const icp: IcToken = {
		...mockValidIcToken,
		ledgerCanisterId: LEDGER_ICP,
		symbol: 'ICP',
		decimals: 8,
		fee: 10000n
	};

	beforeEach(() => {
		oisyTradeStore.reset();
		balancesStore.reset(icp.id);
		enabledIcTokensMock.set([]);
		exchangesMock.set({});
	});

	it('should render the empty state when there is nothing to deposit', () => {
		const { getByText } = render(TradingDepositModal);

		expect(getByText(en.trading.deposit.empty_title)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.empty_description)).toBeInTheDocument();
	});

	it('should render the supported token symbols as chips in the empty state', () => {
		oisyTradeStore.set({
			pairs: [
				buildPair({ base: 'ICP', quote: 'ckUSDC' }),
				buildPair({ base: 'ckBTC', quote: 'ckUSDC' })
			],
			supportedTokens: undefined,
			balances: undefined
		});

		const { getByText } = render(TradingDepositModal);

		expect(getByText(en.trading.deposit.empty_title)).toBeInTheDocument();
		expect(getByText('ICP')).toBeInTheDocument();
		expect(getByText('ckUSDC')).toBeInTheDocument();
		expect(getByText('ckBTC')).toBeInTheDocument();
	});

	it('should render the deposit form when there is a depositable token', () => {
		enabledIcTokensMock.set([icp]);
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: [supportedToken()],
			balances: undefined
		});
		balancesStore.set({ id: icp.id, data: { data: 100000000n, certified: true } });

		const { getByText } = render(TradingDepositModal);

		expect(getByText(en.trading.deposit.you_deposit)).toBeInTheDocument();
		expect(getByText(en.trading.deposit.consent)).toBeInTheDocument();
	});
});
