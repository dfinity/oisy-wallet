import type {
	DepositRequest,
	DepositResponse,
	GetMyOrdersArgs,
	GetOrderBookDepthRequest,
	LimitOrderRequest,
	_SERVICE as OisyTradeService,
	OrderBookDepth,
	OrderBookTicker,
	OrderId,
	Token,
	TradingPair,
	TradingPairInfo,
	UserOrder,
	UserTokenBalance,
	WithdrawRequest,
	WithdrawResponse
} from '$declarations/oisy_trade/oisy_trade.did';
import { idlFactory as idlCertifiedFactoryOisyTrade } from '$declarations/oisy_trade/oisy_trade.factory.certified.did';
import { idlFactory as idlFactoryOisyTrade } from '$declarations/oisy_trade/oisy_trade.factory.did';
import { getAgent } from '$lib/actors/agents.ic';
import { mapOisyTradeError } from '$lib/canisters/oisy-trade.errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { Canister, createServices } from '@dfinity/utils';

export class OisyTradeCanister extends Canister<OisyTradeService> {
	static async create({
		identity,
		...options
	}: CreateCanisterOptions<OisyTradeService>): Promise<OisyTradeCanister> {
		const agent = await getAgent({ identity });

		const { service, certifiedService, canisterId } = createServices<OisyTradeService>({
			options: {
				...options,
				agent
			},
			idlFactory: idlFactoryOisyTrade,
			certifiedIdlFactory: idlCertifiedFactoryOisyTrade
		});

		return new OisyTradeCanister(canisterId, service, certifiedService);
	}

	getTradingPairs = (): Promise<TradingPairInfo[]> => {
		const { get_trading_pairs } = this.caller({ certified: false });

		return get_trading_pairs();
	};

	listSupportedTokens = (): Promise<Token[]> => {
		const { list_supported_tokens } = this.caller({ certified: false });

		return list_supported_tokens();
	};

	getBalances = async (): Promise<UserTokenBalance[]> => {
		const { get_balances } = this.caller({ certified: false });

		const response = await get_balances([]);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapOisyTradeError(response.Err);
	};

	deposit = async (request: DepositRequest): Promise<DepositResponse> => {
		const { deposit } = this.caller({ certified: true });

		const response = await deposit(request);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapOisyTradeError(response.Err);
	};

	withdraw = async (request: WithdrawRequest): Promise<WithdrawResponse> => {
		const { withdraw } = this.caller({ certified: true });

		const response = await withdraw(request);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapOisyTradeError(response.Err);
	};

	getOrderBookTicker = async (pair: TradingPair): Promise<OrderBookTicker> => {
		const { get_order_book_ticker } = this.caller({ certified: false });

		const response = await get_order_book_ticker(pair);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapOisyTradeError(response.Err);
	};

	getOrderBookDepth = async (request: GetOrderBookDepthRequest): Promise<OrderBookDepth> => {
		const { get_order_book_depth } = this.caller({ certified: false });

		const response = await get_order_book_depth(request);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapOisyTradeError(response.Err);
	};

	getMyOrders = async (args: GetMyOrdersArgs): Promise<UserOrder[]> => {
		const { get_my_orders } = this.caller({ certified: false });

		const response = await get_my_orders([args]);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapOisyTradeError(response.Err);
	};

	addLimitOrder = async (request: LimitOrderRequest): Promise<OrderId> => {
		// `add_limit_order` mutates the order book, so it must run on the certified service.
		const { add_limit_order } = this.caller({ certified: true });

		const response = await add_limit_order(request);

		if ('Ok' in response) {
			return response.Ok;
		}

		throw mapOisyTradeError(response.Err);
	};
}
