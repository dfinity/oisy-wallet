import type { Result_3 } from '$declarations/airdrop/airdrop.did';
import type { CoingeckoSimplePriceResponse } from '$lib/types/coingecko';

export type PostMessageRequest =
	| 'startIdleTimer'
	| 'stopIdleTimer'
	| 'startCodeTimer'
	| 'stopCodeTimer'
	| 'startExchangeTimer'
	| 'stopExchangeTimer';

export type PostMessageDataRequest = never;
export type PostMessageDataResponse = object;

export type PostMessageResponse =
	| 'signOutIdleTimer'
	| 'delegationRemainingTime'
	| 'syncAirdropCode'
	| 'syncExchange';

export interface PostMessageDataResponseAuth extends PostMessageDataResponse {
	authRemainingTime: number;
}

export interface PostMessageDataResponseAirdropCode extends PostMessageDataResponse {
	airdrop: Result_3;
}

export interface PostMessageDataResponseExchange extends PostMessageDataResponse {
	currentPrices: CoingeckoSimplePriceResponse;
}

export interface PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> {
	msg: PostMessageRequest | PostMessageResponse;
	data?: T;
}
