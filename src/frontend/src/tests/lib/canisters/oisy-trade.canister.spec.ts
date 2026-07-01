import type {
	DepositRequest,
	DepositResponse,
	GetOrderBookDepthRequest,
	LimitOrderRequest,
	_SERVICE as OisyTradeService,
	OrderBookDepth,
	OrderBookTicker,
	OrderId,
	Token,
	TradingPair,
	TradingPairInfo,
	UserTokenBalance
} from '$declarations/oisy_trade/oisy_trade.did';
import { OisyTradeCanister } from '$lib/canisters/oisy-trade.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable } from '@dfinity/utils';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('oisy-trade.canister', () => {
	const createOisyTradeCanister = ({
		serviceOverride
	}: Pick<
		CreateCanisterOptions<OisyTradeService>,
		'serviceOverride'
	>): Promise<OisyTradeCanister> =>
		OisyTradeCanister.create({
			canisterId: Principal.fromText('4mmnk-kiaaa-aaaag-qbllq-cai'),
			identity: mockIdentity,
			serviceOverride,
			certifiedServiceOverride: serviceOverride
		});

	const service = mock<ActorSubclass<OisyTradeService>>();

	const tradingPair: TradingPair = {
		base: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
		quote: Principal.fromText('xevnm-gaaaa-aaaar-qafnq-cai')
	};

	const mockResponseError = new Error('OISY TRADE error');

	const depositRequest: DepositRequest = {
		token_id: { ledger_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai') },
		amount: 100n
	};
	const depositResponse: DepositResponse = { block_index: 7n };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getTradingPairs', () => {
		it('returns the trading pairs', async () => {
			const pairs = [{ tick_size: 1n }] as unknown as TradingPairInfo[];
			service.get_trading_pairs.mockResolvedValue(pairs);

			const { getTradingPairs } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getTradingPairs()).resolves.toBe(pairs);
			expect(service.get_trading_pairs).toHaveBeenCalledExactlyOnceWith();
		});
	});

	describe('listSupportedTokens', () => {
		it('returns the supported tokens', async () => {
			const tokens = [{ metadata: { symbol: 'ICP' } }] as unknown as Token[];
			service.list_supported_tokens.mockResolvedValue(tokens);

			const { listSupportedTokens } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(listSupportedTokens()).resolves.toBe(tokens);
			expect(service.list_supported_tokens).toHaveBeenCalledExactlyOnceWith();
		});
	});

	describe('getBalances', () => {
		const balances = [{ balance: { free: 1n } }] as unknown as UserTokenBalance[];

		it('unwraps the Ok response', async () => {
			service.get_balances.mockResolvedValue({ Ok: balances });

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).resolves.toBe(balances);
			expect(service.get_balances).toHaveBeenCalledExactlyOnceWith([]);
		});

		it('throws the canister message when present', async () => {
			service.get_balances.mockResolvedValue({
				Err: { kind: { InternalError: [] }, message: ['boom'] }
			} as never);

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toThrow('boom');
		});

		it('falls back to the error kind when no message is present', async () => {
			service.get_balances.mockResolvedValue({
				Err: { kind: { InternalError: [] }, message: [] }
			} as never);

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toThrow('InternalError');
		});
	});

	describe('getOrderBookTicker', () => {
		const ticker = { bid: [], ask: [] } as unknown as OrderBookTicker;

		it('unwraps the Ok response and forwards the pair', async () => {
			service.get_order_book_ticker.mockResolvedValue({ Ok: ticker });

			const { getOrderBookTicker } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getOrderBookTicker(tradingPair)).resolves.toBe(ticker);
			expect(service.get_order_book_ticker).toHaveBeenCalledExactlyOnceWith(tradingPair);
		});

		it('throws the mapped error', async () => {
			service.get_order_book_ticker.mockResolvedValue({
				Err: { kind: { RequestError: [{ UnknownTradingPair: null }] }, message: [] }
			} as never);

			const { getOrderBookTicker } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getOrderBookTicker(tradingPair)).rejects.toThrow('RequestError');
		});
	});

	describe('getOrderBookDepth', () => {
		const depth = { bids: [], asks: [] } as unknown as OrderBookDepth;
		const request: GetOrderBookDepthRequest = { trading_pair: tradingPair, limit: [] };

		it('unwraps the Ok response and forwards the request', async () => {
			service.get_order_book_depth.mockResolvedValue({ Ok: depth });

			const { getOrderBookDepth } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getOrderBookDepth(request)).resolves.toBe(depth);
			expect(service.get_order_book_depth).toHaveBeenCalledExactlyOnceWith(request);
		});

		it('throws the canister message', async () => {
			service.get_order_book_depth.mockResolvedValue({
				Err: { kind: { InternalError: [] }, message: ['too large'] }
			} as never);

			const { getOrderBookDepth } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getOrderBookDepth(request)).rejects.toThrow('too large');
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

		it('unwraps the Ok order id', async () => {
			service.add_limit_order.mockResolvedValue({ Ok: 'order-1' as OrderId });

			const { addLimitOrder } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(addLimitOrder(request)).resolves.toBe('order-1');
			expect(service.add_limit_order).toHaveBeenCalledExactlyOnceWith(request);
		});

		it('throws the canister message when the order is rejected', async () => {
			service.add_limit_order.mockResolvedValue({
				Err: { kind: { InternalError: [] }, message: ['insufficient balance'] }
			} as never);

			const { addLimitOrder } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(addLimitOrder(request)).rejects.toThrow('insufficient balance');
		});

		it('falls back to the error kind without a message', async () => {
			service.add_limit_order.mockResolvedValue({
				Err: { kind: { InvalidOrder: null }, message: [] }
			} as never);

			const { addLimitOrder } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(addLimitOrder(request)).rejects.toThrow('InvalidOrder');
		});
	});

	describe('deposit', () => {
		it('forwards the request to the certified service and unwraps the Ok variant', async () => {
			service.deposit.mockResolvedValue({ Ok: depositResponse });

			const { deposit } = await createOisyTradeCanister({ serviceOverride: service });

			const result = await deposit(depositRequest);

			expect(result).toEqual(depositResponse);
			expect(service.deposit).toHaveBeenCalledWith(depositRequest);
		});

		it('throws the canister message when the Err variant carries one', async () => {
			service.deposit.mockResolvedValue({
				Err: { kind: { InvalidRequest: [] }, message: toNullable('amount too small') }
			} as unknown as Awaited<ReturnType<typeof service.deposit>>);

			const { deposit } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(deposit(depositRequest)).rejects.toThrow('amount too small');
		});

		it('falls back to the kind discriminant when the Err message is empty', async () => {
			service.deposit.mockResolvedValue({
				Err: { kind: { InvalidRequest: [] }, message: toNullable<string>(undefined) }
			} as unknown as Awaited<ReturnType<typeof service.deposit>>);

			const { deposit } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(deposit(depositRequest)).rejects.toThrow('InvalidRequest');
		});

		it('throws when the service rejects', async () => {
			service.deposit.mockRejectedValue(mockResponseError);

			const { deposit } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(deposit(depositRequest)).rejects.toThrow(mockResponseError);
		});
	});
});
