import type { UserOrder } from '$declarations/oisy_trade/oisy_trade.did';
import { ZERO } from '$lib/constants/app.constants';
import {
	oisyTradeActiveOrders,
	oisyTradeHistoryOrders,
	oisyTradeOrders
} from '$lib/derived/oisy-trade.derived';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import type { OisyTradeOrderStatus } from '$lib/types/oisy-trade';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

const baseLedgerId = mockValidIcToken.ledgerCanisterId;
const quoteLedgerId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

// The orders derivations resolve base/quote against `enabledIcTokens`; override
// just that export (keeping the rest of the module real, so other derived
// stores that re-export from it still load) with the two tokens so the orders
// aren't dropped as unresolvable. The factory is hoisted, so build the tokens
// inline to avoid referencing top-level bindings.
vi.mock(import('$lib/derived/tokens.derived'), async (importOriginal) => {
	const { mockValidIcToken } = await import('$tests/mocks/ic-tokens.mock');
	const { writable } = await import('svelte/store');

	return {
		...(await importOriginal()),
		enabledIcTokens: writable([
			{ ...mockValidIcToken, symbol: 'ICP', decimals: 8 },
			{
				...mockValidIcToken,
				symbol: 'ckUSDC',
				decimals: 6,
				ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai'
			}
		])
	};
});

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
});
