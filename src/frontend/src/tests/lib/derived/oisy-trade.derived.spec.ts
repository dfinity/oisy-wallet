import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import type { IcToken } from '$icp/types/ic-token';
import { ZERO } from '$lib/constants/app.constants';
import {
	oisyTradeBalances,
	oisyTradePairs,
	oisyTradeSupportedTokens,
	oisyTradeWithdrawTokens
} from '$lib/derived/oisy-trade.derived';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get, writable } from 'svelte/store';

const enabledIcTokensStore = writable<IcToken[]>([]);

vi.mock('$lib/derived/tokens.derived', () => ({
	enabledIcTokens: {
		subscribe: (run: (value: IcToken[]) => void) => enabledIcTokensStore.subscribe(run)
	}
}));

describe('oisy-trade.derived', () => {
	const dexBalance = ({
		ledgerCanisterId,
		free,
		reserved
	}: {
		ledgerCanisterId: string;
		free: bigint;
		reserved: bigint;
	}): UserTokenBalance =>
		({
			token: { id: { ledger_id: Principal.fromText(ledgerCanisterId) } },
			balance: { free, reserved }
		}) as unknown as UserTokenBalance;

	beforeEach(() => {
		oisyTradeStore.reset();
		enabledIcTokensStore.set([]);
	});

	describe('oisyTradePairs', () => {
		it('is empty by default', () => {
			expect(get(oisyTradePairs)).toEqual([]);
		});

		it('reflects the pairs in the store', () => {
			const pairs = [{ tick_size: 1n }] as unknown as TradingPairInfo[];
			oisyTradeStore.set({ pairs, supportedTokens: undefined, balances: undefined });

			expect(get(oisyTradePairs)).toEqual(pairs);
		});
	});

	describe('oisyTradeSupportedTokens', () => {
		it('is empty by default', () => {
			expect(get(oisyTradeSupportedTokens)).toEqual([]);
		});

		it('reflects the supported tokens in the store', () => {
			const supportedTokens = [{ metadata: { symbol: 'ICP' } }] as unknown as Token[];
			oisyTradeStore.set({ pairs: undefined, supportedTokens, balances: undefined });

			expect(get(oisyTradeSupportedTokens)).toEqual(supportedTokens);
		});
	});

	describe('oisyTradeBalances', () => {
		it('is empty by default', () => {
			expect(get(oisyTradeBalances)).toEqual([]);
		});

		it('reflects the balances in the store', () => {
			const balances = [
				dexBalance({
					ledgerCanisterId: mockValidIcToken.ledgerCanisterId,
					free: 5n,
					reserved: ZERO
				})
			];
			oisyTradeStore.set({ pairs: undefined, supportedTokens: undefined, balances });

			expect(get(oisyTradeBalances)).toEqual(balances);
		});
	});

	describe('oisyTradeWithdrawTokens', () => {
		it('is empty when there are no balances', () => {
			enabledIcTokensStore.set([mockValidIcToken]);

			expect(get(oisyTradeWithdrawTokens)).toEqual([]);
		});

		it('resolves a DEX balance to the matching enabled token by ledger canister id', () => {
			enabledIcTokensStore.set([mockValidIcToken]);
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: undefined,
				balances: [
					dexBalance({
						ledgerCanisterId: mockValidIcToken.ledgerCanisterId,
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
			enabledIcTokensStore.set([mockValidIcToken]);
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: undefined,
				balances: [
					dexBalance({ ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai', free: 10n, reserved: ZERO })
				]
			});

			expect(get(oisyTradeWithdrawTokens)).toEqual([]);
		});

		it('resolves a testnet token enabled by ledger canister id', () => {
			const testnetLedgerCanisterId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
			const testnetToken: IcToken = {
				...mockValidIcToken,
				ledgerCanisterId: testnetLedgerCanisterId,
				network: { ...mockValidIcToken.network, env: 'testnet' }
			};

			enabledIcTokensStore.set([testnetToken]);
			oisyTradeStore.set({
				pairs: undefined,
				supportedTokens: undefined,
				balances: [
					dexBalance({ ledgerCanisterId: testnetLedgerCanisterId, free: 7n, reserved: ZERO })
				]
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
					dexBalance({
						ledgerCanisterId: mockValidIcToken.ledgerCanisterId,
						free: 1n,
						reserved: ZERO
					})
				]
			});

			expect(get(oisyTradeWithdrawTokens)).toEqual([]);

			enabledIcTokensStore.set([mockValidIcToken]);

			expect(get(oisyTradeWithdrawTokens)).toEqual([
				{ token: mockValidIcToken, free: 1n, reserved: ZERO }
			]);
		});
	});
});
