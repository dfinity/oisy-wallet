export type PostMessageRequest = 'startIdleTimer' | 'stopIdleTimer';

export type PostMessageDataRequest = never;
export type PostMessageDataResponse = never;

export type PostMessageResponse = 'signOutIdleTimer';

export interface PostMessage<T extends PostMessageDataRequest | PostMessageDataResponse> {
	msg: PostMessageRequest | PostMessageResponse;
	data?: T;
}
