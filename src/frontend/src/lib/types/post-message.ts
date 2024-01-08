import type { Result_3 } from '$declarations/airdrop/airdrop.did';
import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { PostMessageWalletData } from '$icp/types/ic.post-message';
import type { CoingeckoSimplePriceResponse } from '$lib/types/coingecko';

import type { IcCanisters } from '$icp/types/ic';

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

export type PostMessageDataRequestIcrc = Pick<IcCanisters, 'indexCanisterId'>;

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
	currentBtcPrice: CoingeckoSimplePriceResponse;
	currentErc20Prices: CoingeckoSimplePriceResponse;
	currentIcpPrice: CoingeckoSimplePriceResponse;
}

export interface PostMessageDataResponseExchangeError extends PostMessageDataResponse {
	err: string | undefined;
}

export interface PostMessageDataResponseWallet<T> extends PostMessageDataResponse {
	wallet: PostMessageWalletData<T>;
}

export interface PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> {
	msg: PostMessageRequest | PostMessageResponse;
	data?: T;
}
