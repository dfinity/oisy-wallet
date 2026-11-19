import type {
	PostMessage,
	PostMessageDataRequest,
	PostMessageDataResponseLoose
} from '$lib/types/post-message';

export interface WorkerData {
	worker: Worker;
	// Index into the shared worker pool when this wrapper is attached to a pooled (shared) worker.
	// Undefined for a dedicated worker owned solely by this wrapper.
	poolIndex?: number;
}

export type WorkerId = string;

export type WithoutWorkerId<T> = T extends { workerId: unknown } ? never : T;

export type WorkerPostMessageData = PostMessageDataRequest | PostMessageDataResponseLoose;

export type WorkerListener<T extends WorkerPostMessageData> = (
	ev: MessageEvent<PostMessage<T>>
) => void;
