export type PostMessageRequest = 'startIdleTimer' | 'stopIdleTimer';

export type PostMessageDataRequest = never;
export type PostMessageDataResponse = object;

export type PostMessageResponse = 'signOutIdleTimer' | 'delegationRemainingTime';

export interface PostMessageDataResponseAuth extends PostMessageDataResponse {
	authRemainingTime: number;
}

export interface PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> {
	msg: PostMessageRequest | PostMessageResponse;
	data?: T;
}
