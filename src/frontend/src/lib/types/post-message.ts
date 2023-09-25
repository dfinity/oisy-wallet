import type { Result_3 } from '$declarations/airdrop/airdrop.did';

export type PostMessageRequest =
	| 'startIdleTimer'
	| 'stopIdleTimer'
	| 'startCodeTimer'
	| 'stopCodeTimer';

export type PostMessageDataRequest = never;
export type PostMessageDataResponse = object;

export type PostMessageResponse =
	| 'signOutIdleTimer'
	| 'delegationRemainingTime'
	| 'syncAirdropCode';

export interface PostMessageDataResponseAuth extends PostMessageDataResponse {
	authRemainingTime: number;
}

export interface PostMessageDataResponseAirdropCode extends PostMessageDataResponse {
	airdrop: Result_3;
}

export interface PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> {
	msg: PostMessageRequest | PostMessageResponse;
	data?: T;
}
