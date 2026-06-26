import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import {
	oisyTradeBalances,
	oisyTradeFreeBalanceBySymbol,
	oisyTradeIcTokenBySymbol,
	oisyTradePairs,
	oisyTradeSupportedTokens
} from '$lib/derived/oisy-trade.derived';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

const { mockEnabledIcTokens } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable: hoistedWritable } = require('svelte/store');
	return { mockEnabledIcTokens: hoistedWritable([]) };
});

vi.mock('$lib/derived/tokens.derived', () => ({
	enabledIcTokens: mockEnabledIcTokens
}));

describe('oisy-trade.derived', () => {
	const icpLedgerId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
	const ckusdcLedgerId = 'xevnm-gaaaa-aaaar-qafnq-cai';

	const tradeToken = ({ symbol, ledgerId }: { symbol: string; ledgerId: string }): Token =>
		({
			id: { ledger_id: Principal.fromText(ledgerId) },
			metadata: { symbol, decimals: 8 }
		}) as unknown as Token;

	const icToken = ({ symbol, ledgerId }: { symbol: string; ledgerId: string }): IcToken => ({
		...mockValidIcToken,
		symbol,
		ledgerCanisterId: ledgerId
	});

	beforeEach(() => {
		oisyTradeStore.reset();
		mockEnabledIcTokens.set([]);
	});

	describe('oisyTradePairs', () => {
		it('is an empty array when the store is unset', () => {
			expect(get(oisyTradePairs)).toEqual([]);
		});

		it('exposes the store pairs', () => {
			const pairs = [{ tick_size: 1n }] as unknown as TradingPairInfo[];
			oisyTradeStore.set({ pairs, supportedTokens: undefined, balances: undefined });

			expect(get(oisyTradePairs)).toBe(pairs);
		});
	});

	describe('oisyTradeSupportedTokens', () => {
		it('is an empty array when the store is unset', () => {
			expect(get(oisyTradeSupportedTokens)).toEqual([]);
		});

		it('exposes the store supported tokens', () => {
			const supportedTokens = [tradeToken({ symbol: 'ICP', ledgerId: icpLedgerId })];
			oisyTradeStore.set({ pairs: undefined, supportedTokens, balances: undefined });

			expect(get(oisyTradeSupportedTokens)).toBe(supportedTokens);
		});
	});

	describe('oisyTradeBalances', () => {
		it('is an empty array when the store is unset', () => {
			expect(get(oisyTradeBalances)).toEqual([]);
		});

		it('exposes the store balances', () => {
			const balances = [{ balance: { free: 1n, reserved: ZERO } }] as unknown as UserTokenBalance[];
			oisyTradeStore.set({ pairs: undefined, supportedTokens: undefined, balances });

			expect(get(oisyTradeBalances)).toBe(balances);
		});
	});

	describe('oisyTradeIcTokenBySymbol', () => {
		it('is empty without supported tokens', () => {
			expect(get(oisyTradeIcTokenBySymbol)).toEqual({});
		});

		it('resolves trade tokens to enabled IC tokens by ledger id', () => {
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: [
					tradeToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
					tradeToken({ symbol: 'ckUSDC', ledgerId: ckusdcLedgerId })
				],
				balances: undefined
			});
			mockEnabledIcTokens.set([
				icToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
				icToken({ symbol: 'ckUSDC', ledgerId: ckusdcLedgerId })
			]);

			const resolved = get(oisyTradeIcTokenBySymbol);

			expect(Object.keys(resolved)).toEqual(['ICP', 'ckUSDC']);
			expect(resolved.ICP.ledgerCanisterId).toBe(icpLedgerId);
			expect(resolved.ckUSDC.ledgerCanisterId).toBe(ckusdcLedgerId);
		});

		it('skips trade tokens with no matching enabled IC token', () => {
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: [
					tradeToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
					tradeToken({ symbol: 'ckUSDC', ledgerId: ckusdcLedgerId })
				],
				balances: undefined
			});
			// Only ICP is enabled.
			mockEnabledIcTokens.set([icToken({ symbol: 'ICP', ledgerId: icpLedgerId })]);

			const resolved = get(oisyTradeIcTokenBySymbol);

			expect(Object.keys(resolved)).toEqual(['ICP']);
			expect(resolved.ckUSDC).toBeUndefined();
		});

		it('keeps the first match when a symbol appears more than once', () => {
			const otherLedgerId = 'mxzaz-hqaaa-aaaar-qaada-cai';
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: [
					tradeToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
					tradeToken({ symbol: 'ICP', ledgerId: otherLedgerId })
				],
				balances: undefined
			});
			mockEnabledIcTokens.set([
				icToken({ symbol: 'ICP', ledgerId: icpLedgerId }),
				icToken({ symbol: 'ICP', ledgerId: otherLedgerId })
			]);

			const resolved = get(oisyTradeIcTokenBySymbol);

			expect(Object.keys(resolved)).toEqual(['ICP']);
			expect(resolved.ICP.ledgerCanisterId).toBe(icpLedgerId);
		});
	});

	describe('oisyTradeFreeBalanceBySymbol', () => {
		it('is empty without balances', () => {
			expect(get(oisyTradeFreeBalanceBySymbol)).toEqual({});
		});

		it('scales each free balance to human units keyed by symbol', () => {
			const balances = [
				{ token: { metadata: { symbol: 'ICP', decimals: 8 } }, balance: { free: 250_000_000n } },
				{ token: { metadata: { symbol: 'ckUSDC', decimals: 6 } }, balance: { free: 5_000_000n } }
			] as unknown as UserTokenBalance[];
			oisyTradeStore.set({ pairs: undefined, supportedTokens: undefined, balances });

			expect(get(oisyTradeFreeBalanceBySymbol)).toEqual({ ICP: 2.5, ckUSDC: 5 });
		});
	});
});
