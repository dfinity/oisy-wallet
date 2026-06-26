import type {
	Token,
	TokenId,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import * as oisyTradeApi from '$lib/api/oisy-trade.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
import { loadOisyTrade, withdrawFromOisyTrade } from '$lib/services/oisy-trade.services';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

vi.mock('$lib/api/oisy-trade.api', () => ({
	getTradingPairs: vi.fn(),
	listSupportedTokens: vi.fn(),
	getBalances: vi.fn(),
	withdraw: vi.fn()
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
		vi.mocked(oisyTradeApi.withdraw).mockResolvedValue({ block_index: 1n });
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

	describe('withdrawFromOisyTrade', () => {
		const tokenId: TokenId = { ledger_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') };

		it('parses the gross amount, calls withdraw and reloads balances', async () => {
			const progress = vi.fn();

			await withdrawFromOisyTrade({
				identity: mockIdentity,
				tokenId,
				amount: '1.5',
				decimals: 8,
				progress
			});

			expect(oisyTradeApi.withdraw).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					request: { token_id: tokenId, amount: 150_000_000n }
				})
			);
			// Balances are reloaded after a successful withdrawal.
			expect(oisyTradeApi.getBalances).toHaveBeenCalled();
			expect(progress).toHaveBeenCalledWith(ProgressStepsTradingWithdraw.WITHDRAW);
			expect(progress).toHaveBeenCalledWith(ProgressStepsTradingWithdraw.DONE);
		});

		it('throws and does not reload when there is no identity', async () => {
			await expect(
				withdrawFromOisyTrade({ identity: null, tokenId, amount: '1', decimals: 8 })
			).rejects.toThrow();

			expect(oisyTradeApi.withdraw).not.toHaveBeenCalled();
		});
	});
});
