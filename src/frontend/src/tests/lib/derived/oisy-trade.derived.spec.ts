import type {
	Token as OisyTradeToken,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get, writable } from 'svelte/store';

const enabledIcTokensMock = writable<IcToken[]>([]);
const exchangesMock = writable<Record<string, { usd: number } | undefined>>({});

vi.mock('$lib/derived/tokens.derived', () => ({
	get enabledIcTokens() {
		return enabledIcTokensMock;
	}
}));

vi.mock('$lib/derived/exchange.derived', () => ({
	get exchanges() {
		return exchangesMock;
	}
}));

const {
	oisyTradePairs,
	oisyTradeSupportedTokens,
	oisyTradeBalances,
	oisyTradeSupportedTokenSymbols,
	oisyTradeAssets,
	oisyTradeUsdValue,
	oisyTradeHasAssets,
	oisyTradeDepositableTokens
} = await import('$lib/derived/oisy-trade.derived');

const LEDGER_ICP = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

const buildPair = ({ base, quote }: { base: string; quote: string }): TradingPairInfo =>
	({
		base: { metadata: { symbol: base } },
		quote: { metadata: { symbol: quote } }
	}) as unknown as TradingPairInfo;

const supportedToken = (ledgerId: string): OisyTradeToken =>
	({
		id: { ledger_id: Principal.fromText(ledgerId) },
		metadata: { symbol: 'X', decimals: 8 }
	}) as unknown as OisyTradeToken;

const buildBalance = ({
	ledgerId,
	free,
	reserved
}: {
	ledgerId: string;
	free: bigint;
	reserved: bigint;
}): UserTokenBalance =>
	({
		token: { id: { ledger_id: Principal.fromText(ledgerId) } },
		balance: { free, reserved }
	}) as unknown as UserTokenBalance;

describe('oisy-trade.derived', () => {
	beforeEach(() => {
		oisyTradeStore.reset();
		enabledIcTokensMock.set([]);
		exchangesMock.set({});
	});

	describe('oisyTradePairs / oisyTradeSupportedTokens / oisyTradeBalances', () => {
		it('default to empty arrays when the store is empty', () => {
			expect(get(oisyTradePairs)).toEqual([]);
			expect(get(oisyTradeSupportedTokens)).toEqual([]);
			expect(get(oisyTradeBalances)).toEqual([]);
		});

		it('reflect the values seeded into the store', () => {
			const pairs = [buildPair({ base: 'ICP', quote: 'ckBTC' })];
			const supportedTokens = [supportedToken(LEDGER_ICP)];
			const balances = [buildBalance({ ledgerId: LEDGER_ICP, free: 1n, reserved: ZERO })];

			oisyTradeStore.set({ pairs, supportedTokens, balances });

			expect(get(oisyTradePairs)).toEqual(pairs);
			expect(get(oisyTradeSupportedTokens)).toEqual(supportedTokens);
			expect(get(oisyTradeBalances)).toEqual(balances);
		});
	});

	describe('oisyTradeSupportedTokenSymbols', () => {
		it('returns the distinct union of base and quote symbols', () => {
			oisyTradeStore.set({
				pairs: [
					buildPair({ base: 'ICP', quote: 'ckUSDC' }),
					buildPair({ base: 'ICP', quote: 'ckBTC' })
				],
				supportedTokens: undefined,
				balances: undefined
			});

			expect(get(oisyTradeSupportedTokenSymbols)).toEqual(['ICP', 'ckUSDC', 'ckBTC']);
		});

		it('is empty when there are no pairs', () => {
			expect(get(oisyTradeSupportedTokenSymbols)).toEqual([]);
		});
	});

	describe('oisyTradeAssets / oisyTradeUsdValue / oisyTradeHasAssets', () => {
		const icp: IcToken = { ...mockValidIcToken, ledgerCanisterId: LEDGER_ICP, symbol: 'ICP' };

		it('resolve DEX balances to enabled tokens enriched with fiat values', () => {
			enabledIcTokensMock.set([icp]);
			exchangesMock.set({ [icp.id]: { usd: 2 } });
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: undefined,
				balances: [buildBalance({ ledgerId: LEDGER_ICP, free: 100n, reserved: 50n })]
			});

			const assets = get(oisyTradeAssets);

			expect(assets).toHaveLength(1);
			expect(assets[0].token).toBe(icp);
			expect(assets[0].total).toBe(150n);
			expect(get(oisyTradeUsdValue)).toBeGreaterThan(0);
			expect(get(oisyTradeHasAssets)).toBeTruthy();
		});

		it('are empty and zero-valued when there are no balances', () => {
			enabledIcTokensMock.set([icp]);

			expect(get(oisyTradeAssets)).toEqual([]);
			expect(get(oisyTradeUsdValue)).toBe(0);
			expect(get(oisyTradeHasAssets)).toBeFalsy();
		});
	});

	describe('oisyTradeDepositableTokens', () => {
		const icp: IcToken = { ...mockValidIcToken, ledgerCanisterId: LEDGER_ICP, symbol: 'ICP' };

		it('returns supported tokens the user holds a balance for', () => {
			enabledIcTokensMock.set([icp]);
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: [supportedToken(LEDGER_ICP)],
				balances: undefined
			});
			balancesStore.set({ id: icp.id, data: { data: 5n, certified: true } });

			expect(get(oisyTradeDepositableTokens)).toEqual([icp]);
		});

		it('drops tokens with no wallet balance', () => {
			enabledIcTokensMock.set([icp]);
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: [supportedToken(LEDGER_ICP)],
				balances: undefined
			});
			balancesStore.set({ id: icp.id, data: { data: ZERO, certified: true } });

			expect(get(oisyTradeDepositableTokens)).toEqual([]);
		});
	});
});
