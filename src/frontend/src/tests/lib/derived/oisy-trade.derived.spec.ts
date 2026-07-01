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
	oisyTradeWithdrawTokens,
	oisyTradeLoaded,
	oisyTradeSupportedTokenSymbols,
	oisyTradeIcTokenBySymbol,
	oisyTradeFreeBalanceBySymbol,
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
	const icpLedgerId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
	const ckusdcLedgerId = 'xevnm-gaaaa-aaaar-qafnq-cai';

	const tradeToken = ({ symbol, ledgerId }: { symbol: string; ledgerId: string }): OisyTradeToken =>
		({
			id: { ledger_id: Principal.fromText(ledgerId) },
			metadata: { symbol, decimals: 8 }
		}) as unknown as OisyTradeToken;

	const icToken = ({ symbol, ledgerId }: { symbol: string; ledgerId: string }): IcToken => ({
		...mockValidIcToken,
		symbol,
		ledgerCanisterId: ledgerId
	});

	beforeEach(() => {
		oisyTradeStore.reset();
		enabledIcTokensMock.set([]);
		exchangesMock.set({});
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

	describe('oisyTradeWithdrawTokens', () => {
		it('is empty when there are no balances', () => {
			enabledIcTokensMock.set([mockValidIcToken]);

			expect(get(oisyTradeWithdrawTokens)).toEqual([]);
		});

		it('resolves a DEX balance to the matching enabled token by ledger canister id', () => {
			enabledIcTokensMock.set([mockValidIcToken]);
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: undefined,
				balances: [
					buildBalance({
						ledgerId: mockValidIcToken.ledgerCanisterId,
						free: 10n,
						reserved: 3n
					})
				]
			});

			expect(get(oisyTradeWithdrawTokens)).toEqual([
				{ token: mockValidIcToken, free: 10n, reserved: 3n }
			]);
		});

		it('drops balances whose ledger is unknown to the wallet', () => {
			enabledIcTokensMock.set([mockValidIcToken]);
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: undefined,
				balances: [buildBalance({ ledgerId: LEDGER_ICP, free: 10n, reserved: ZERO })]
			});

			expect(get(oisyTradeWithdrawTokens)).toEqual([]);
		});

		it('resolves a testnet token enabled by ledger canister id', () => {
			const testnetLedgerCanisterId = LEDGER_ICP;
			const testnetToken: IcToken = {
				...mockValidIcToken,
				ledgerCanisterId: testnetLedgerCanisterId,
				network: { ...mockValidIcToken.network, env: 'testnet' }
			};

			enabledIcTokensMock.set([testnetToken]);
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: undefined,
				balances: [buildBalance({ ledgerId: testnetLedgerCanisterId, free: 7n, reserved: ZERO })]
			});

			expect(get(oisyTradeWithdrawTokens)).toEqual([
				{ token: testnetToken, free: 7n, reserved: ZERO }
			]);
		});

		it('recomputes when enabled tokens change', () => {
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: undefined,
				balances: [
					buildBalance({
						ledgerId: mockValidIcToken.ledgerCanisterId,
						free: 1n,
						reserved: ZERO
					})
				]
			});

			expect(get(oisyTradeWithdrawTokens)).toEqual([]);

			enabledIcTokensMock.set([mockValidIcToken]);

			expect(get(oisyTradeWithdrawTokens)).toEqual([
				{ token: mockValidIcToken, free: 1n, reserved: ZERO }
			]);
		});
	});

	describe('oisyTradeLoaded', () => {
		it('is false while balances are unset', () => {
			expect(get(oisyTradeLoaded)).toBeFalsy();
		});

		it('is true once balances resolve, even when empty', () => {
			oisyTradeStore.set({ pairs: undefined, supportedTokens: undefined, balances: [] });

			expect(get(oisyTradeLoaded)).toBeTruthy();
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
			enabledIcTokensMock.set([
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
			enabledIcTokensMock.set([icToken({ symbol: 'ICP', ledgerId: icpLedgerId })]);

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
			enabledIcTokensMock.set([
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
