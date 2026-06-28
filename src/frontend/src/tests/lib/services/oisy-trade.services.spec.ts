import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import * as oisyTradeApi from '$lib/api/oisy-trade.api';
import { ZERO } from '$lib/constants/app.constants';
import { loadOisyTrade } from '$lib/services/oisy-trade.services';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { mockIdentity, mockPrincipal2 } from '$tests/mocks/identity.mock';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

vi.mock('$lib/api/oisy-trade.api', () => ({
	getTradingPairs: vi.fn(),
	listSupportedTokens: vi.fn(),
	getBalances: vi.fn()
}));

describe('oisy-trade.services', () => {
	const pairs = [{ tick_size: 1n }] as unknown as TradingPairInfo[];
	const supportedTokens = [{ metadata: { symbol: 'ICP' } }] as unknown as Token[];
	const balances = [{ balance: { free: 1n, reserved: ZERO } }] as unknown as UserTokenBalance[];
	const pairs2 = [{ tick_size: 2n }] as unknown as TradingPairInfo[];
	const supportedTokens2 = [{ metadata: { symbol: 'ckUSDC' } }] as unknown as Token[];
	const balances2 = [{ balance: { free: 2n, reserved: ZERO } }] as unknown as UserTokenBalance[];
	const mockIdentity2 = {
		...mockIdentity,
		getPrincipal: () => mockPrincipal2
	} as Identity;

	const deferred = <T>() => {
		let resolve: (value: T) => void;
		const promise = new Promise<T>((res) => {
			resolve = res;
		});

		return { promise, resolve: resolve! };
	};

	beforeEach(() => {
		vi.clearAllMocks();
		oisyTradeStore.reset();
		vi.mocked(oisyTradeApi.getTradingPairs).mockResolvedValue(pairs);
		vi.mocked(oisyTradeApi.listSupportedTokens).mockResolvedValue(supportedTokens);
		vi.mocked(oisyTradeApi.getBalances).mockResolvedValue(balances);
	});

	describe('loadOisyTrade', () => {
		it('resets the store and does not call the canister when there is no identity', async () => {
			oisyTradeStore.set({ pairs, supportedTokens, balances });

			await loadOisyTrade({ identity: null });

			expect(get(oisyTradeStore)).toEqual({
				pairs: undefined,
				supportedTokens: undefined,
				balances: undefined
			});
			expect(oisyTradeApi.getTradingPairs).not.toHaveBeenCalled();
		});

		it('loads pairs, supported tokens and balances into the store', async () => {
			await loadOisyTrade({ identity: mockIdentity });

			expect(get(oisyTradeStore)).toEqual({ pairs, supportedTokens, balances });
		});

		it('swallows canister errors and leaves the store unchanged', async () => {
			vi.mocked(oisyTradeApi.getTradingPairs).mockRejectedValue(new Error('canister down'));

			await expect(loadOisyTrade({ identity: mockIdentity })).resolves.toBeUndefined();

			expect(get(oisyTradeStore)).toEqual({
				pairs: undefined,
				supportedTokens: undefined,
				balances: undefined
			});
		});

		it('ignores a load that resolves after the user signs out', async () => {
			const pairsDeferred = deferred<TradingPairInfo[]>();
			const supportedTokensDeferred = deferred<Token[]>();
			const balancesDeferred = deferred<UserTokenBalance[]>();

			vi.mocked(oisyTradeApi.getTradingPairs).mockReturnValue(pairsDeferred.promise);
			vi.mocked(oisyTradeApi.listSupportedTokens).mockReturnValue(supportedTokensDeferred.promise);
			vi.mocked(oisyTradeApi.getBalances).mockReturnValue(balancesDeferred.promise);

			const loadPromise = loadOisyTrade({ identity: mockIdentity });

			await loadOisyTrade({ identity: null });

			pairsDeferred.resolve(pairs);
			supportedTokensDeferred.resolve(supportedTokens);
			balancesDeferred.resolve(balances);
			await loadPromise;

			expect(get(oisyTradeStore)).toEqual({
				pairs: undefined,
				supportedTokens: undefined,
				balances: undefined
			});
		});

		it('keeps the latest principal data when an earlier load finishes late', async () => {
			const pairsDeferred = deferred<TradingPairInfo[]>();
			const supportedTokensDeferred = deferred<Token[]>();
			const balancesDeferred = deferred<UserTokenBalance[]>();

			vi.mocked(oisyTradeApi.getTradingPairs)
				.mockReturnValueOnce(pairsDeferred.promise)
				.mockResolvedValueOnce(pairs2);
			vi.mocked(oisyTradeApi.listSupportedTokens)
				.mockReturnValueOnce(supportedTokensDeferred.promise)
				.mockResolvedValueOnce(supportedTokens2);
			vi.mocked(oisyTradeApi.getBalances)
				.mockReturnValueOnce(balancesDeferred.promise)
				.mockResolvedValueOnce(balances2);

			const firstLoadPromise = loadOisyTrade({ identity: mockIdentity });

			await loadOisyTrade({ identity: mockIdentity2 });

			expect(get(oisyTradeStore)).toEqual({
				pairs: pairs2,
				supportedTokens: supportedTokens2,
				balances: balances2
			});

			pairsDeferred.resolve(pairs);
			supportedTokensDeferred.resolve(supportedTokens);
			balancesDeferred.resolve(balances);
			await firstLoadPromise;

			expect(get(oisyTradeStore)).toEqual({
				pairs: pairs2,
				supportedTokens: supportedTokens2,
				balances: balances2
			});
		});
	});
});
