import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import TradingOrders from '$lib/components/trading/TradingOrders.svelte';
import { modalStore } from '$lib/stores/modal.store';
import { tokenListStore } from '$lib/stores/token-list.store';
import type { OisyTradeOrderStatus, OisyTradeOrderView } from '$lib/types/oisy-trade';
import { parseTokenId } from '$lib/validation/token.validation';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

const {
	activeOrdersMock,
	historyOrdersMock,
	pairsMock,
	authIdentityMock,
	mockLoadOisyTrade,
	mockLoadOrderBook,
	mockPlaceLimitOrder
} = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');

	return {
		activeOrdersMock: writable([]),
		historyOrdersMock: writable([]),
		pairsMock: writable([]),
		authIdentityMock: writable(undefined),
		mockLoadOisyTrade: vi.fn(() => Promise.resolve(undefined)),
		mockLoadOrderBook: vi.fn(() => Promise.resolve(undefined)),
		mockPlaceLimitOrder: vi.fn(() => Promise.resolve(undefined))
	};
});

vi.mock('$lib/derived/auth.derived', () => ({
	authIdentity: authIdentityMock
}));

vi.mock('$lib/derived/oisy-trade.derived', () => ({
	oisyTradeActiveOrders: activeOrdersMock,
	oisyTradeHistoryOrders: historyOrdersMock,
	oisyTradePairs: pairsMock
}));

vi.mock('$lib/services/oisy-trade.services', () => ({
	loadOisyTrade: mockLoadOisyTrade,
	loadOrderBook: mockLoadOrderBook,
	placeLimitOrder: mockPlaceLimitOrder
}));

const ICP_LEDGER = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
const CKBTC_LEDGER = 'mxzaz-hqaaa-aaaar-qaada-cai';
const CKUSDC_LEDGER = 'aaaaa-aa';

const token = ({
	id,
	ledgerCanisterId,
	name,
	symbol,
	decimals = 8
}: {
	id: string;
	ledgerCanisterId: string;
	name: string;
	symbol: string;
	decimals?: number;
}): IcToken => ({
	...mockValidIcToken,
	id: parseTokenId(id),
	ledgerCanisterId,
	name,
	symbol,
	decimals
});

const icp = token({
	id: 'IcpTradingToken',
	ledgerCanisterId: ICP_LEDGER,
	name: 'Internet Computer',
	symbol: 'ICP'
});

const ckBtc = token({
	id: 'CkBtcTradingToken',
	ledgerCanisterId: CKBTC_LEDGER,
	name: 'Chain-key Bitcoin',
	symbol: 'ckBTC'
});

const ckUsdc = token({
	id: 'CkUsdcTradingToken',
	ledgerCanisterId: CKUSDC_LEDGER,
	name: 'Chain-key USDC',
	symbol: 'ckUSDC',
	decimals: 6
});

const pair = ({ base, quote }: { base: IcToken; quote: IcToken }): TradingPairInfo =>
	({
		status: { Trading: null },
		base: {
			id: { ledger_id: Principal.fromText(base.ledgerCanisterId) },
			metadata: { symbol: base.symbol, decimals: base.decimals }
		},
		quote: {
			id: { ledger_id: Principal.fromText(quote.ledgerCanisterId) },
			metadata: { symbol: quote.symbol, decimals: quote.decimals }
		},
		min_notional: 1_000_000n,
		lot_size: 100_000_000n,
		taker_fee_bps: 0,
		maker_fee_bps: 0,
		tick_size: 10_000n,
		max_notional: []
	}) as TradingPairInfo;

const order = ({
	base,
	id,
	status = 'Open'
}: {
	base: IcToken;
	id: string;
	status?: OisyTradeOrderStatus;
}): OisyTradeOrderView => ({
	id,
	side: 'sell',
	base,
	quote: ckUsdc,
	quantity: 10,
	price: 2.5,
	filledQuantity: 0,
	status
});

describe('TradingOrders', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();
		tokenListStore.set({ filter: '' });
		activeOrdersMock.set([]);
		historyOrdersMock.set([]);
		pairsMock.set([]);
		authIdentityMock.set(undefined);
	});

	it('filters active orders and polls order books only for visible active pairs', async () => {
		activeOrdersMock.set([
			order({ id: 'icp-order', base: icp }),
			order({ id: 'ckbtc-order', base: ckBtc })
		]);
		pairsMock.set([pair({ base: icp, quote: ckUsdc }), pair({ base: ckBtc, quote: ckUsdc })]);
		tokenListStore.set({ filter: 'bitcoin' });

		const { container } = render(TradingOrders);

		expect(container).toHaveTextContent('ckBTC');
		expect(container).not.toHaveTextContent('ICP');

		await waitFor(() => expect(mockLoadOrderBook).toHaveBeenCalledOnce());
		const [loadOrderBookParams] = mockLoadOrderBook.mock.calls[0] as unknown as [
			{ pair: { base: { toText: () => string } } }
		];

		expect(loadOrderBookParams.pair.base.toText()).toBe(CKBTC_LEDGER);
	});

	it('shows no results without polling when the active filter hides every order', async () => {
		activeOrdersMock.set([order({ id: 'icp-order', base: icp })]);
		pairsMock.set([pair({ base: icp, quote: ckUsdc })]);
		tokenListStore.set({ filter: 'dogecoin' });

		const { container } = render(TradingOrders);

		expect(container).toHaveTextContent(en.core.text.no_results);

		await tick();

		expect(mockLoadOrderBook).not.toHaveBeenCalled();
	});

	it('filters the history tab by order status label', async () => {
		historyOrdersMock.set([
			order({ id: 'filled-order', base: icp, status: 'Filled' }),
			order({ id: 'canceled-order', base: ckBtc, status: 'Canceled' })
		]);
		tokenListStore.set({ filter: 'canceled' });

		const { container, getByRole } = render(TradingOrders);

		await fireEvent.click(getByRole('button', { name: en.trading.orders.tab_history }));

		expect(container).toHaveTextContent('ckBTC');
		expect(container).toHaveTextContent(en.trading.orders.status_canceled);
		expect(container).not.toHaveTextContent('ICP');
		expect(container).not.toHaveTextContent(en.trading.orders.status_filled);
	});
});
