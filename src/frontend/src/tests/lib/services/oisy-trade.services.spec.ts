import type {
	Token,
	TokenId,
	TradingPairInfo,
	UserOrder,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import * as oisyTradeApi from '$lib/api/oisy-trade.api';
import { ZERO } from '$lib/constants/app.constants';
import { OISY_TRADE_MAX_ORDER_PAGES } from '$lib/constants/oisy-trade.constants';
import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
import {
	cancelLimitOrder,
	loadOisyTrade,
	withdrawFromOisyTrade
} from '$lib/services/oisy-trade.services';
import { oisyTradeStore } from '$lib/stores/oisy-trade.store';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { get } from 'svelte/store';

vi.mock('$lib/api/oisy-trade.api', () => ({
	getTradingPairs: vi.fn(),
	listSupportedTokens: vi.fn(),
	getBalances: vi.fn(),
	getMyOrders: vi.fn(),
	withdraw: vi.fn(),
	cancelLimitOrder: vi.fn()
}));

describe('oisy-trade.services', () => {
	const pairs = [{ tick_size: 1n }] as unknown as TradingPairInfo[];
	const supportedTokens = [{ metadata: { symbol: 'ICP' } }] as unknown as Token[];
	const balances = [{ balance: { free: 1n, reserved: ZERO } }] as unknown as UserTokenBalance[];
	const orders = [{ id: 'order-1' }] as unknown as UserOrder[];

	beforeEach(() => {
		vi.clearAllMocks();
		oisyTradeStore.reset();
		vi.mocked(oisyTradeApi.getTradingPairs).mockResolvedValue(pairs);
		vi.mocked(oisyTradeApi.listSupportedTokens).mockResolvedValue(supportedTokens);
		vi.mocked(oisyTradeApi.getBalances).mockResolvedValue(balances);
		vi.mocked(oisyTradeApi.getMyOrders).mockResolvedValue(orders);
		vi.mocked(oisyTradeApi.withdraw).mockResolvedValue({ block_index: 1n });
	});

	describe('loadOisyTrade', () => {
		it('resets the store and does not call the canister when there is no identity', async () => {
			oisyTradeStore.set({ pairs, supportedTokens, balances, orders });

			await loadOisyTrade({ identity: null });

			expect(get(oisyTradeStore)).toEqual({
				pairs: undefined,
				supportedTokens: undefined,
				balances: undefined,
				orders: undefined
			});
			expect(oisyTradeApi.getTradingPairs).not.toHaveBeenCalled();
		});

		it('loads pairs, supported tokens, balances and orders into the store', async () => {
			await loadOisyTrade({ identity: mockIdentity });

			expect(get(oisyTradeStore)).toEqual({ pairs, supportedTokens, balances, orders });
		});

		it('requests the newest orders page (no cursor, length 100)', async () => {
			await loadOisyTrade({ identity: mockIdentity });

			expect(oisyTradeApi.getMyOrders).toHaveBeenCalledWith(
				expect.objectContaining({
					args: { filter: { ByPage: { after: [], length: 100 } } }
				})
			);
		});

		it('follows the ByPage cursor across pages until a short page', async () => {
			const fullPage = Array.from({ length: 100 }, (_, i) => ({
				id: `a-${i}`
			})) as unknown as UserOrder[];
			const lastPage = [{ id: 'b-0' }] as unknown as UserOrder[];
			vi.mocked(oisyTradeApi.getMyOrders)
				.mockResolvedValueOnce(fullPage)
				.mockResolvedValueOnce(lastPage);

			await loadOisyTrade({ identity: mockIdentity });

			expect(oisyTradeApi.getMyOrders).toHaveBeenCalledTimes(2);
			expect(oisyTradeApi.getMyOrders).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					args: { filter: { ByPage: { after: ['a-99'], length: 100 } } }
				})
			);
			expect(get(oisyTradeStore).orders).toEqual([...fullPage, ...lastPage]);
		});

		it('stops at the page cap even when every page is full', async () => {
			const fullPage = Array.from({ length: 100 }, (_, i) => ({
				id: `x-${i}`
			})) as unknown as UserOrder[];
			vi.mocked(oisyTradeApi.getMyOrders).mockResolvedValue(fullPage);

			await loadOisyTrade({ identity: mockIdentity });

			expect(oisyTradeApi.getMyOrders).toHaveBeenCalledTimes(OISY_TRADE_MAX_ORDER_PAGES);
		});

		it('keeps the orders loaded so far when a later page fails', async () => {
			const fullPage = Array.from({ length: 100 }, (_, i) => ({
				id: `y-${i}`
			})) as unknown as UserOrder[];
			vi.mocked(oisyTradeApi.getMyOrders)
				.mockResolvedValueOnce(fullPage)
				.mockRejectedValueOnce(new Error('page 2 down'));

			await loadOisyTrade({ identity: mockIdentity });

			expect(get(oisyTradeStore).orders).toEqual(fullPage);
		});

		it('swallows canister errors and leaves the store unchanged', async () => {
			vi.mocked(oisyTradeApi.getTradingPairs).mockRejectedValue(new Error('canister down'));

			await expect(loadOisyTrade({ identity: mockIdentity })).resolves.toBeUndefined();

			expect(get(oisyTradeStore)).toEqual({
				pairs: undefined,
				supportedTokens: undefined,
				balances: undefined,
				orders: undefined
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

	describe('cancelLimitOrder', () => {
		beforeEach(() => {
			vi.mocked(oisyTradeApi.cancelLimitOrder).mockResolvedValue(
				{} as Awaited<ReturnType<typeof oisyTradeApi.cancelLimitOrder>>
			);
		});

		it('cancels the order via the api with the order id', async () => {
			await cancelLimitOrder({ identity: mockIdentity, orderId: 'order-1' });

			expect(oisyTradeApi.cancelLimitOrder).toHaveBeenCalledWith(
				expect.objectContaining({ identity: mockIdentity, orderId: 'order-1' })
			);
		});

		it('throws and does not call the api when there is no identity', async () => {
			await expect(cancelLimitOrder({ identity: null, orderId: 'order-1' })).rejects.toThrow();

			expect(oisyTradeApi.cancelLimitOrder).not.toHaveBeenCalled();
		});
	});
});
