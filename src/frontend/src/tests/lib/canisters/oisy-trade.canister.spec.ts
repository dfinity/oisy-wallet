import type {
	DepositRequest,
	DepositResponse,
	GetMyOrdersArgs,
	GetOrderBookDepthRequest,
	LimitOrderRequest,
	_SERVICE as OisyTradeService,
	OrderBookDepth,
	OrderBookTicker,
	OrderRecord,
	PriceLevel,
	TradingPair,
	UserOrder,
	UserTokenBalance,
	WithdrawRequest,
	WithdrawResponse
} from '$declarations/oisy_trade/oisy_trade.did';
import { OisyTradeCanister } from '$lib/canisters/oisy-trade.canister';
import { OisyTradeRequestError, OisyTradeTemporaryError } from '$lib/canisters/oisy-trade.errors';
import { ZERO } from '$lib/constants/app.constants';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity, mockPrincipal } from '$tests/mocks/identity.mock';
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
			canisterId: Principal.fromText('aaaaa-aa'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});

	const service = mock<ActorSubclass<OisyTradeService>>();

	const baseLedgerId = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');
	const quoteLedgerId = Principal.fromText('mxzaz-hqaaa-aaaar-qaada-cai');
	const tradingPair: TradingPair = { base: baseLedgerId, quote: quoteLedgerId };
	const baseTokenId = { ledger_id: baseLedgerId };
	const quoteTokenId = { ledger_id: quoteLedgerId };
	const priceLevel: PriceLevel = { price: 100_000_000n, quantity: 25_000_000n };
	const orderRecord: OrderRecord = {
		status: { Open: null },
		owner: mockPrincipal,
		filled_quantity: ZERO,
		side: { Sell: null },
		created_at: 1n,
		last_updated_at: [],
		quantity: priceLevel.quantity,
		price: priceLevel.price,
		time_in_force: { GoodTilCanceled: null }
	};
	const userOrder: UserOrder = {
		id: 'order-1',
		order: orderRecord,
		pair: tradingPair
	};
	const depositRequest: DepositRequest = { token_id: baseTokenId, amount: 10_000n };
	const depositResponse: DepositResponse = { block_index: 1_000n };
	const withdrawRequest: WithdrawRequest = { token_id: quoteTokenId, amount: 20_000n };
	const withdrawResponse: WithdrawResponse = { block_index: 2_000n };
	const limitOrderRequest: LimitOrderRequest = {
		pair: tradingPair,
		side: { Sell: null },
		quantity: priceLevel.quantity,
		price: priceLevel.price,
		time_in_force: []
	};
	const balance: UserTokenBalance = {
		token: { id: baseTokenId, metadata: { decimals: 8, symbol: 'ckBTC' } },
		balance: { free: 30_000n, reserved: ZERO }
	};
	const ticker: OrderBookTicker = { ask: [priceLevel], bid: [] };
	const depthRequest: GetOrderBookDepthRequest = { trading_pair: tradingPair, limit: [10] };
	const depth: OrderBookDepth = { asks: [priceLevel], bids: [] };
	const args: GetMyOrdersArgs = { filter: { ByPage: { after: [], length: 100 } } };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getBalances', () => {
		it('unwraps Ok into the balances list and requests every token', async () => {
			const balances = [balance];
			service.get_balances.mockResolvedValue({ Ok: balances });

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			const res = await getBalances();

			expect(res).toEqual(balances);
			expect(service.get_balances).toHaveBeenCalledExactlyOnceWith([]);
		});

		it('maps canister errors to retry-aware typed errors', async () => {
			service.get_balances.mockResolvedValue({
				Err: { kind: { TemporaryError: [] }, message: ['Balances temporarily unavailable'] }
			});

			const { getBalances } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getBalances()).rejects.toBeInstanceOf(OisyTradeTemporaryError);
			await expect(getBalances()).rejects.toMatchObject({
				message: 'Balances temporarily unavailable',
				retryable: true,
				reason: 'TemporaryError'
			});
		});
	});

	describe('deposit', () => {
		it('unwraps Ok into the deposit response and forwards the request', async () => {
			service.deposit.mockResolvedValue({ Ok: depositResponse });

			const { deposit } = await createOisyTradeCanister({ serviceOverride: service });

			const res = await deposit(depositRequest);

			expect(res).toEqual(depositResponse);
			expect(service.deposit).toHaveBeenCalledExactlyOnceWith(depositRequest);
		});

		it('maps canister errors to retry-aware typed errors', async () => {
			service.deposit.mockResolvedValue({
				Err: {
					kind: { TemporaryError: [{ OperationInProgress: null }] },
					message: ['Deposit already in progress']
				}
			});

			const { deposit } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(deposit(depositRequest)).rejects.toMatchObject({
				message: 'Deposit already in progress',
				retryable: true,
				reason: 'OperationInProgress'
			});
		});
	});

	describe('withdraw', () => {
		it('unwraps Ok into the withdraw response and forwards the request', async () => {
			service.withdraw.mockResolvedValue({ Ok: withdrawResponse });

			const { withdraw } = await createOisyTradeCanister({ serviceOverride: service });

			const res = await withdraw(withdrawRequest);

			expect(res).toEqual(withdrawResponse);
			expect(service.withdraw).toHaveBeenCalledExactlyOnceWith(withdrawRequest);
		});

		it('maps canister errors to retry-aware typed errors', async () => {
			service.withdraw.mockResolvedValue({
				Err: {
					kind: { RequestError: [{ InsufficientBalance: { available: 100n } }] },
					message: ['Insufficient balance']
				}
			});

			const { withdraw } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(withdraw(withdrawRequest)).rejects.toBeInstanceOf(OisyTradeRequestError);
			await expect(withdraw(withdrawRequest)).rejects.toMatchObject({
				message: 'Insufficient balance',
				retryable: false,
				reason: 'InsufficientBalance'
			});
		});
	});

	describe('getOrderBookTicker', () => {
		it('unwraps Ok into the ticker and forwards the trading pair', async () => {
			service.get_order_book_ticker.mockResolvedValue({ Ok: ticker });

			const { getOrderBookTicker } = await createOisyTradeCanister({ serviceOverride: service });

			const res = await getOrderBookTicker(tradingPair);

			expect(res).toEqual(ticker);
			expect(service.get_order_book_ticker).toHaveBeenCalledExactlyOnceWith(tradingPair);
		});

		it('maps canister errors to retry-aware typed errors', async () => {
			service.get_order_book_ticker.mockResolvedValue({
				Err: { kind: { RequestError: [{ UnknownTradingPair: null }] }, message: [] }
			});

			const { getOrderBookTicker } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getOrderBookTicker(tradingPair)).rejects.toMatchObject({
				message: 'UnknownTradingPair',
				retryable: false,
				reason: 'UnknownTradingPair'
			});
		});
	});

	describe('getOrderBookDepth', () => {
		it('unwraps Ok into the depth and forwards the request', async () => {
			service.get_order_book_depth.mockResolvedValue({ Ok: depth });

			const { getOrderBookDepth } = await createOisyTradeCanister({ serviceOverride: service });

			const res = await getOrderBookDepth(depthRequest);

			expect(res).toEqual(depth);
			expect(service.get_order_book_depth).toHaveBeenCalledExactlyOnceWith(depthRequest);
		});

		it('maps canister errors to retry-aware typed errors', async () => {
			service.get_order_book_depth.mockResolvedValue({
				Err: {
					kind: { RequestError: [{ LimitTooLarge: { max: 1_000, requested: 1_001 } }] },
					message: []
				}
			});

			const { getOrderBookDepth } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getOrderBookDepth(depthRequest)).rejects.toMatchObject({
				message: 'LimitTooLarge',
				retryable: false,
				reason: 'LimitTooLarge'
			});
		});
	});

	describe('getMyOrders', () => {
		it('unwraps Ok into the orders list and forwards the args', async () => {
			const orders = [userOrder];
			service.get_my_orders.mockResolvedValue({ Ok: orders });

			const { getMyOrders } = await createOisyTradeCanister({ serviceOverride: service });

			const res = await getMyOrders(args);

			expect(res).toEqual(orders);
			expect(service.get_my_orders).toHaveBeenCalledExactlyOnceWith([args]);
		});

		it('throws with the canister message when present', async () => {
			service.get_my_orders.mockResolvedValue({
				Err: { kind: { RequestError: [{ OrderNotFound: null }] }, message: ['Unknown order id'] }
			});

			const { getMyOrders } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getMyOrders(args)).rejects.toThrow('Unknown order id');
		});

		it('falls back to the kind discriminant when there is no message', async () => {
			service.get_my_orders.mockResolvedValue({
				Err: { kind: { TemporaryError: [] }, message: [] }
			});

			const { getMyOrders } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(getMyOrders(args)).rejects.toThrow('TemporaryError');
		});
	});

	describe('addLimitOrder', () => {
		it('unwraps Ok into the order id and forwards the request', async () => {
			service.add_limit_order.mockResolvedValue({ Ok: userOrder.id });

			const { addLimitOrder } = await createOisyTradeCanister({ serviceOverride: service });

			const res = await addLimitOrder(limitOrderRequest);

			expect(res).toBe(userOrder.id);
			expect(service.add_limit_order).toHaveBeenCalledExactlyOnceWith(limitOrderRequest);
		});

		it('maps canister errors to retry-aware typed errors', async () => {
			service.add_limit_order.mockResolvedValue({
				Err: {
					kind: { TemporaryError: [{ TradingHalted: null }] },
					message: ['Trading is halted']
				}
			});

			const { addLimitOrder } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(addLimitOrder(limitOrderRequest)).rejects.toMatchObject({
				message: 'Trading is halted',
				retryable: true,
				reason: 'TradingHalted'
			});
		});
	});

	describe('cancelLimitOrder', () => {
		it('unwraps Ok into the order record and forwards the order id', async () => {
			service.cancel_limit_order.mockResolvedValue({ Ok: orderRecord });

			const { cancelLimitOrder } = await createOisyTradeCanister({ serviceOverride: service });

			const res = await cancelLimitOrder(userOrder.id);

			expect(res).toEqual(orderRecord);
			expect(service.cancel_limit_order).toHaveBeenCalledExactlyOnceWith(userOrder.id);
		});

		it('maps canister errors to retry-aware typed errors', async () => {
			service.cancel_limit_order.mockResolvedValue({
				Err: { kind: { RequestError: [{ OrderAlreadyTerminal: null }] }, message: [] }
			});

			const { cancelLimitOrder } = await createOisyTradeCanister({ serviceOverride: service });

			await expect(cancelLimitOrder(userOrder.id)).rejects.toMatchObject({
				message: 'OrderAlreadyTerminal',
				retryable: false,
				reason: 'OrderAlreadyTerminal'
			});
		});
	});
});
