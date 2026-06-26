import type {
	GetOrderBookDepthRequest,
	LimitOrderRequest,
	OrderBookDepth,
	OrderBookTicker,
	OrderId,
	Token,
	TradingPair,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import {
	addLimitOrder,
	getBalances,
	getOrderBookDepth,
	getOrderBookTicker,
	getTradingPairs,
	listSupportedTokens
} from '$lib/api/oisy-trade.api';
import { OisyTradeCanister } from '$lib/canisters/oisy-trade.canister';
import * as appConstants from '$lib/constants/app.constants';
import { mockLedgerCanisterId } from '$tests/mocks/ic-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('oisy-trade.api', () => {
	const oisyTradeCanisterMock = mock<OisyTradeCanister>();

	const tradingPair: TradingPair = {
		base: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
		quote: Principal.fromText('xevnm-gaaaa-aaaar-qafnq-cai')
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// eslint-disable-next-line require-await
		vi.spyOn(OisyTradeCanister, 'create').mockImplementation(async () => oisyTradeCanisterMock);
		vi.spyOn(appConstants, 'OISY_TRADE_CANISTER_ID', 'get').mockImplementation(
			() => mockLedgerCanisterId
		);
	});

	describe('getTradingPairs', () => {
		it('delegates to the canister', async () => {
			const pairs = [{ tick_size: 1n }] as unknown as TradingPairInfo[];
			oisyTradeCanisterMock.getTradingPairs.mockResolvedValue(pairs);

			const result = await getTradingPairs({ identity: mockIdentity });

			expect(result).toBe(pairs);
			expect(oisyTradeCanisterMock.getTradingPairs).toHaveBeenCalledOnce();
		});

		it('throws without an identity', async () => {
			await expect(getTradingPairs({ identity: null })).rejects.toThrow();
		});
	});

	describe('listSupportedTokens', () => {
		it('delegates to the canister', async () => {
			const tokens = [{ metadata: { symbol: 'ICP' } }] as unknown as Token[];
			oisyTradeCanisterMock.listSupportedTokens.mockResolvedValue(tokens);

			const result = await listSupportedTokens({ identity: mockIdentity });

			expect(result).toBe(tokens);
			expect(oisyTradeCanisterMock.listSupportedTokens).toHaveBeenCalledOnce();
		});

		it('throws without an identity', async () => {
			await expect(listSupportedTokens({ identity: null })).rejects.toThrow();
		});
	});

	describe('getBalances', () => {
		it('delegates to the canister', async () => {
			const balances = [{ balance: { free: 1n } }] as unknown as UserTokenBalance[];
			oisyTradeCanisterMock.getBalances.mockResolvedValue(balances);

			const result = await getBalances({ identity: mockIdentity });

			expect(result).toBe(balances);
			expect(oisyTradeCanisterMock.getBalances).toHaveBeenCalledOnce();
		});

		it('throws without an identity', async () => {
			await expect(getBalances({ identity: null })).rejects.toThrow();
		});
	});

	describe('getOrderBookTicker', () => {
		it('delegates to the canister with the pair', async () => {
			const ticker = { bid: [], ask: [] } as unknown as OrderBookTicker;
			oisyTradeCanisterMock.getOrderBookTicker.mockResolvedValue(ticker);

			const result = await getOrderBookTicker({ identity: mockIdentity, pair: tradingPair });

			expect(result).toBe(ticker);
			expect(oisyTradeCanisterMock.getOrderBookTicker).toHaveBeenCalledExactlyOnceWith(tradingPair);
		});

		it('throws without an identity', async () => {
			await expect(getOrderBookTicker({ identity: null, pair: tradingPair })).rejects.toThrow();
		});
	});

	describe('getOrderBookDepth', () => {
		const request: GetOrderBookDepthRequest = { trading_pair: tradingPair, limit: [] };

		it('delegates to the canister with the request', async () => {
			const depth = { bids: [], asks: [] } as unknown as OrderBookDepth;
			oisyTradeCanisterMock.getOrderBookDepth.mockResolvedValue(depth);

			const result = await getOrderBookDepth({ identity: mockIdentity, request });

			expect(result).toBe(depth);
			expect(oisyTradeCanisterMock.getOrderBookDepth).toHaveBeenCalledExactlyOnceWith(request);
		});

		it('throws without an identity', async () => {
			await expect(getOrderBookDepth({ identity: null, request })).rejects.toThrow();
		});
	});

	describe('addLimitOrder', () => {
		const request = {
			pair: tradingPair,
			side: { Sell: null },
			quantity: 25_000_000n,
			price: 2_690_000n,
			time_in_force: []
		} as unknown as LimitOrderRequest;

		it('delegates to the canister with the request', async () => {
			oisyTradeCanisterMock.addLimitOrder.mockResolvedValue('order-1' as OrderId);

			const result = await addLimitOrder({ identity: mockIdentity, request });

			expect(result).toBe('order-1');
			expect(oisyTradeCanisterMock.addLimitOrder).toHaveBeenCalledExactlyOnceWith(request);
		});

		it('throws without an identity', async () => {
			await expect(addLimitOrder({ identity: null, request })).rejects.toThrow();
		});
	});
});
