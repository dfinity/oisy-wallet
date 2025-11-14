import type {
	PostMessage,
	PostMessageDataRequest,
	PostMessageDataResponseLoose
} from '$lib/types/post-message';

export interface WorkerData {
	worker: Worker;
	isSingleton: boolean;
}

export type WorkerPostMessageData = PostMessageDataRequest | PostMessageDataResponseLoose;

export type WorkerListener<T extends WorkerPostMessageData> = (
	ev: MessageEvent<PostMessage<T>>
) => void;
