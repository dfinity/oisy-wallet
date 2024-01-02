import type { Result_3 } from '$declarations/airdrop/airdrop.did';
import type { CoingeckoSimplePriceResponse } from '$lib/types/coingecko';
import type { Erc20ContractAddress } from '$lib/types/erc20';
import type { Wallet } from '$lib/types/ic';
import type { IcrcCanisters } from '$lib/types/icrc';

export type PostMessageRequest =
	| 'startIdleTimer'
	| 'stopIdleTimer'
	| 'startCodeTimer'
	| 'stopCodeTimer'
	| 'startExchangeTimer'
	| 'stopExchangeTimer'
	| 'stopIcpWalletTimer'
	| 'startIcpWalletTimer'
	| 'stopIcrcWalletTimer'
	| 'startIcrcWalletTimer';

export type PostMessageDataRequest = never;
export type PostMessageDataResponse = object;

export interface PostMessageDataRequestExchangeTimer {
	erc20Addresses: Erc20ContractAddress[];
}

export type PostMessageDataRequestIcrc = Pick<IcrcCanisters, 'indexCanisterId'>;

export type PostMessageResponse =
	| 'signOutIdleTimer'
	| 'delegationRemainingTime'
	| 'syncAirdropCode'
	| 'syncExchange'
	| 'syncExchangeError'
	| 'syncIcpWallet'
	| 'syncIcrcWallet';

export interface PostMessageDataResponseAuth extends PostMessageDataResponse {
	authRemainingTime: number;
}

export interface PostMessageDataResponseAirdropCode extends PostMessageDataResponse {
	airdrop: Result_3;
}

export interface PostMessageDataResponseExchange extends PostMessageDataResponse {
	currentEthPrice: CoingeckoSimplePriceResponse;
	currentErc20Prices: CoingeckoSimplePriceResponse;
	currentIcpPrice: CoingeckoSimplePriceResponse;
}

export interface PostMessageDataResponseExchangeError extends PostMessageDataResponse {
	err: string | undefined;
}

export interface PostMessageDataResponseWallet<T> extends PostMessageDataResponse {
	wallet: Wallet<T>;
}

export interface PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> {
	msg: PostMessageRequest | PostMessageResponse;
	data?: T;
}
