export type PostMessageRequest = 'startIdleTimer' | 'stopIdleTimer';

export type PostMessageDataRequest = {};
export type PostMessageDataResponse = {};

export type PostMessageResponse = 'signOutIdleTimer';

export interface PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> {
	msg: PostMessageRequest | PostMessageResponse;
	data?: T;
}
