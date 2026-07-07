import type { Token, UserOrder, UserTokenBalance } from '$declarations/oisy_trade/oisy_trade.did';
import { ZERO } from '$lib/constants/app.constants';
import {
	oisyTradeActiveOrders,
	oisyTradeDepositableUsdValue,
	oisyTradeFreeUsdValue,
	oisyTradeHistoryOrders,
	oisyTradeOrders,
	oisyTradeReservedUsdValue
} from '$lib/derived/oisy-trade.derived';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { OisyTradeOrderStatus } from '$lib/types/oisy-trade';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

const baseLedgerId = mockValidIcToken.ledgerCanisterId;
const quoteLedgerId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

// Fiat figures need exchange rates and (for the depositable total) wallet
// balances; override just those stores so the tests can drive the values.
const { enabledIcTokensMock, exchangesMock, balancesMock } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable: createWritable } = require('svelte/store');
	return {
		enabledIcTokensMock: createWritable([]),
		exchangesMock: createWritable({}),
		balancesMock: createWritable({})
	};
});

// The orders derivations resolve base/quote against enabled wallet tokens first,
// then fall back to OISY TRADE supported-token metadata. Keep the enabled-token
// store controllable so tests can model a disabled quote leg.
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

vi.mock(import('$lib/stores/balances.store'), async (importOriginal) => ({
	...(await importOriginal()),
	get balancesStore() {
		return balancesMock;
	}
}));

describe('oisy-trade.derived — orders', () => {
	const buildOrder = ({ id, status }: { id: string; status: OisyTradeOrderStatus }): UserOrder =>
		({
			id,
			pair: {
				base: Principal.fromText(baseLedgerId),
				quote: Principal.fromText(quoteLedgerId)
			},
			order: {
				side: { Sell: null },
				price: 1n,
				quantity: 100n,
				filled_quantity: ZERO,
				status: { [status]: null }
			}
		}) as unknown as UserOrder;

	beforeEach(() => {
		oisyTradeStore.reset();
		enabledIcTokensMock.set([
			{ ...mockValidIcToken, symbol: 'ICP', decimals: 8 },
			{
				...mockValidIcToken,
				symbol: 'ckUSDC',
				decimals: 6,
				ledgerCanisterId: quoteLedgerId
			}
		]);
	});

	it('splits orders into active (Pending/Open) and history (Filled/Canceled/Expired)', () => {
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: undefined,
			balances: undefined,
			orders: [
				buildOrder({ id: 'pending', status: 'Pending' }),
				buildOrder({ id: 'open', status: 'Open' }),
				buildOrder({ id: 'filled', status: 'Filled' }),
				buildOrder({ id: 'canceled', status: 'Canceled' }),
				buildOrder({ id: 'expired', status: 'Expired' })
			]
		});

		expect(get(oisyTradeOrders).map(({ id }) => id)).toEqual([
			'pending',
			'open',
			'filled',
			'canceled',
			'expired'
		]);
		expect(get(oisyTradeActiveOrders).map(({ id }) => id)).toEqual(['pending', 'open']);
		expect(get(oisyTradeHistoryOrders).map(({ id }) => id)).toEqual([
			'filled',
			'canceled',
			'expired'
		]);
	});

	it('returns empty lists when no orders are loaded', () => {
		expect(get(oisyTradeOrders)).toEqual([]);
		expect(get(oisyTradeActiveOrders)).toEqual([]);
		expect(get(oisyTradeHistoryOrders)).toEqual([]);
	});

	it('keeps active orders visible when a leg token is supported by the DEX but disabled in the wallet', () => {
		enabledIcTokensMock.set([{ ...mockValidIcToken, symbol: 'ICP', decimals: 8 }]);

		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: [
				{
					id: { ledger_id: Principal.fromText(baseLedgerId) },
					metadata: { symbol: 'ICP', decimals: 8 }
				},
				{
					id: { ledger_id: Principal.fromText(quoteLedgerId) },
					metadata: { symbol: 'ckUSDC', decimals: 6 }
				}
			] as unknown as Token[],
			balances: undefined,
			orders: [buildOrder({ id: 'open', status: 'Open' })]
		});

		expect(get(oisyTradeActiveOrders).map(({ id }) => id)).toEqual(['open']);
		expect(get(oisyTradeActiveOrders)[0].quote.symbol).toBe('ckUSDC');
	});
});

describe('oisy-trade.derived — fiat values', () => {
	// The ICP token resolved from the mocked `enabledIcTokens` keeps mockValidIcToken's id.
	const tokenId = mockValidIcToken.id;

	beforeEach(() => {
		oisyTradeStore.reset();
		exchangesMock.set({});
		balancesMock.set({});
	});

	it('returns zero for every fiat figure when nothing is loaded', () => {
		expect(get(oisyTradeFreeUsdValue)).toBe(0);
		expect(get(oisyTradeReservedUsdValue)).toBe(0);
		expect(get(oisyTradeDepositableUsdValue)).toBe(0);
	});

	it('splits deposited value into free and reserved (total − free)', () => {
		exchangesMock.set({ [tokenId]: { usd: 2 } });
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: undefined,
			balances: [
				{
					token: { id: { ledger_id: Principal.fromText(baseLedgerId) } },
					balance: { free: 300000000n, reserved: 100000000n }
				}
			] as unknown as UserTokenBalance[],
			orders: undefined
		});

		// 3 ICP free + 1 ICP reserved at $2 → $6 free, $2 in orders.
		expect(get(oisyTradeFreeUsdValue)).toBe(6);
		expect(get(oisyTradeReservedUsdValue)).toBe(2);
	});

	it('sums the wallet value of the depositable tokens', () => {
		exchangesMock.set({ [tokenId]: { usd: 2 } });
		balancesMock.set({ [tokenId]: { data: 500000000n } });
		oisyTradeStore.set({
			pairs: undefined,
			supportedTokens: [
				{
					id: { ledger_id: Principal.fromText(baseLedgerId) },
					metadata: { symbol: 'ICP', decimals: 8 }
				}
			] as unknown as Token[],
			balances: undefined,
			orders: undefined
		});

		// 5 ICP in the wallet at $2 → $10 depositable.
		expect(get(oisyTradeDepositableUsdValue)).toBe(10);
	});
});
