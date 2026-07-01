import type {
	LimitOrderRequest,
	OrderBookDepth,
	OrderBookTicker,
	OrderId,
	Token,
	TokenId,
	TradingPair,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import * as oisyTradeApi from '$lib/api/oisy-trade.api';
import { ZERO } from '$lib/constants/app.constants';
import { ProgressStepsTradingWithdraw } from '$lib/enums/progress-steps';
import {
	loadOisyTrade,
	loadOrderBook,
	placeLimitOrder,
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
	getOrderBookTicker: vi.fn(),
	getOrderBookDepth: vi.fn(),
	addLimitOrder: vi.fn(),
	withdraw: vi.fn()
}));

describe('oisy-trade.services', () => {
	const pairs = [{ tick_size: 1n }] as unknown as TradingPairInfo[];
	const supportedTokens = [{ metadata: { symbol: 'ICP' } }] as unknown as Token[];
	const balances = [{ balance: { free: 1n, reserved: ZERO } }] as unknown as UserTokenBalance[];

	const tradingPair: TradingPair = {
		base: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
		quote: Principal.fromText('xevnm-gaaaa-aaaar-qafnq-cai')
	};
	const ticker = { bid: [], ask: [] } as unknown as OrderBookTicker;
	const depth = { bids: [], asks: [] } as unknown as OrderBookDepth;

	beforeEach(() => {
		vi.clearAllMocks();
		oisyTradeStore.reset();
		vi.mocked(oisyTradeApi.getTradingPairs).mockResolvedValue(pairs);
		vi.mocked(oisyTradeApi.listSupportedTokens).mockResolvedValue(supportedTokens);
		vi.mocked(oisyTradeApi.getBalances).mockResolvedValue(balances);
		vi.mocked(oisyTradeApi.getOrderBookTicker).mockResolvedValue(ticker);
		vi.mocked(oisyTradeApi.getOrderBookDepth).mockResolvedValue(depth);
		vi.mocked(oisyTradeApi.addLimitOrder).mockResolvedValue('order-1' as OrderId);
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

	describe('loadOrderBook', () => {
		it('returns undefined and does not call the canister without an identity', async () => {
			await expect(loadOrderBook({ identity: null, pair: tradingPair })).resolves.toBeUndefined();

			expect(oisyTradeApi.getOrderBookTicker).not.toHaveBeenCalled();
			expect(oisyTradeApi.getOrderBookDepth).not.toHaveBeenCalled();
		});

		it('loads the ticker and depth for the pair', async () => {
			const result = await loadOrderBook({ identity: mockIdentity, pair: tradingPair });

			expect(result).toEqual({ ticker, depth });
			expect(oisyTradeApi.getOrderBookTicker).toHaveBeenCalledWith(
				expect.objectContaining({ identity: mockIdentity, pair: tradingPair })
			);
			expect(oisyTradeApi.getOrderBookDepth).toHaveBeenCalledWith(
				expect.objectContaining({
					identity: mockIdentity,
					request: { trading_pair: tradingPair, limit: [] }
				})
			);
		});

		it('swallows canister errors and returns undefined', async () => {
			vi.mocked(oisyTradeApi.getOrderBookTicker).mockRejectedValue(new Error('canister down'));

			await expect(
				loadOrderBook({ identity: mockIdentity, pair: tradingPair })
			).resolves.toBeUndefined();
		});
	});

	describe('placeLimitOrder', () => {
		const request = {
			pair: tradingPair,
			side: { Sell: null },
			quantity: 25_000_000n,
			price: 2_690_000n,
			time_in_force: []
		} as unknown as LimitOrderRequest;

		it('submits the order and returns the order id', async () => {
			const result = await placeLimitOrder({ identity: mockIdentity, request });

			expect(result).toBe('order-1');
			expect(oisyTradeApi.addLimitOrder).toHaveBeenCalledWith(
				expect.objectContaining({ identity: mockIdentity, request })
			);
		});

		it('throws when there is no identity', async () => {
			await expect(placeLimitOrder({ identity: null, request })).rejects.toThrow();

			expect(oisyTradeApi.addLimitOrder).not.toHaveBeenCalled();
		});

		it('propagates a canister error', async () => {
			vi.mocked(oisyTradeApi.addLimitOrder).mockRejectedValue(new Error('rejected'));

			await expect(placeLimitOrder({ identity: mockIdentity, request })).rejects.toThrow(
				'rejected'
			);
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
