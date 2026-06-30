import type {
	DepositRequest,
	DepositResponse,
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
import { CanisterApi } from '$lib/api/canister.api';
import { OisyTradeCanister } from '$lib/canisters/oisy-trade.canister';
import { OISY_TRADE_CANISTER_ID } from '$lib/constants/app.constants';
import type { CanisterApiFunctionParams } from '$lib/types/canister';
import { assertNonNullish } from '@dfinity/utils';

const oisyTradeApi = new CanisterApi<OisyTradeCanister>();

export const getTradingPairs = async ({
	identity,
	canisterId,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams): Promise<TradingPairInfo[]> => {
	const { getTradingPairs } = await oisyTradeCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return getTradingPairs();
};

export const listSupportedTokens = async ({
	identity,
	canisterId,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams): Promise<Token[]> => {
	const { listSupportedTokens } = await oisyTradeCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return listSupportedTokens();
};

export const getBalances = async ({
	identity,
	canisterId,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams): Promise<UserTokenBalance[]> => {
	const { getBalances } = await oisyTradeCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return getBalances();
};

export const getOrderBookTicker = async ({
	pair,
	identity,
	canisterId,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams<{ pair: TradingPair }>): Promise<OrderBookTicker> => {
	const { getOrderBookTicker } = await oisyTradeCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return getOrderBookTicker(pair);
};

export const getOrderBookDepth = async ({
	request,
	identity,
	canisterId,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams<{ request: GetOrderBookDepthRequest }>): Promise<OrderBookDepth> => {
	const { getOrderBookDepth } = await oisyTradeCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return getOrderBookDepth(request);
};

export const addLimitOrder = async ({
	request,
	identity,
	canisterId,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams<{ request: LimitOrderRequest }>): Promise<OrderId> => {
	const { addLimitOrder } = await oisyTradeCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return addLimitOrder(request);
};

export const deposit = async ({
	request,
	identity,
	canisterId,
	nullishIdentityErrorMessage
}: CanisterApiFunctionParams<{ request: DepositRequest }>): Promise<DepositResponse> => {
	const { deposit } = await oisyTradeCanister({
		identity,
		canisterId,
		nullishIdentityErrorMessage
	});

	return deposit(request);
};

const oisyTradeCanister = async ({
	identity,
	nullishIdentityErrorMessage,
	canisterId = OISY_TRADE_CANISTER_ID
}: CanisterApiFunctionParams): Promise<OisyTradeCanister> => {
	assertNonNullish(identity, nullishIdentityErrorMessage);

	return await oisyTradeApi.getCanister({
		identity,
		canisterId,
		create: OisyTradeCanister.create
	});
};
