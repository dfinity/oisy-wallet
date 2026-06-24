import type {
	Token,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import * as oisyTradeApi from '$lib/api/oisy-trade.api';
import { ZERO } from '$lib/constants/app.constants';
import { loadOisyTrade } from '$lib/services/oisy-trade.services';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { mockIdentity } from '$tests/mocks/identity.mock';
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
	});
});
