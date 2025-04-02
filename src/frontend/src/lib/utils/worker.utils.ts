import type { PostMessageRequestBase } from '$lib/types/post-message';
import { z } from 'zod';

const responseHandlers = new Map<string, (data: unknown) => void>();

/*export function handleResponse(event: MessageEvent<TaggedMessage<PostMessageBase>>): boolean {
	let postMessageBase: PostMessageBase = PostMessageBaseSchema.parse(event);

	if (postMessageBase.type == 'response') {
		const handler = responseHandlers.get(postMessageBase.requestId);
		if (handler) {
			handler(postMessageBase.msg);
			responseHandlers.delete(postMessageBase.requestId);
			return true;
		}
	}
	//
	return false;
}*/

/*
export function initWorkerResponseRouter(worker: Worker) {
	worker.addEventListener('msg', (event) => {
		const { type, requestId } = event.data;

		// Exit immediately if 'type' is missing or not equal to 'response'
		if (!type || type !== 'response') {
			console.error(`Invalid msg type. Expected 'response', but got: ${type}`);
			return; // Exit execution early
		}

		console.log('Valid msg received:', event.data);

		const handler = responseHandlers.get(requestId);
		if (handler) {
			handler(event);
			responseHandlers.delete(requestId);
		}
	});
}
*/

export function routeWorkerResponse(event: MessageEvent): boolean {
	//const { type } = event.data;
	const { type, requestId, ...data } = event.data;

	// Exit immediately if 'type' is missing or not equal to 'response'
	if (!type || type !== 'response') {
		// console.error("Invalid message type. Expected 'response', but got:", messageEvent.data);
		return false; // Exit execution early
	}

	console.log('Valid data received:', event.data);

	const handler = responseHandlers.get(requestId);
	if (handler) {
		handler(data);
		responseHandlers.delete(requestId);
		return true;
	}
	console.log('No handler found for event', requestId);
	return false;
}

/**
 * Sends a typed request to the worker and awaits the fully typed response envelope (T).
 */
export function sendMessageRequest<T>(
	worker: Worker,
	msg: string,
	data: object,
	schema: z.ZodType<T>
): Promise<T> {
	const requestId = crypto.randomUUID();

	// Explicitly type the payload as PostMessageRequestBase
	const payload: PostMessageRequestBase = {
		msg,
		requestId,
		type: 'request',
		tag: 'Ok',
		data: data
	};

	return new Promise((resolve, reject) => {
		responseHandlers.set(requestId, (rawResponse: unknown) => {
			const parsed = schema.safeParse((rawResponse as PostMessageRequestBase).data);
			if (!parsed.success) {
				console.error(
					`Invalid response for message '${msg}' (Request ID: ${requestId}):`,
					parsed.error.format()
				);
				reject(parsed.error);
				return;
			}
			resolve(parsed.data);
		});

		worker.postMessage(payload); // Send the typed payload
	});
}

export function isOk<T, E>(response: {
	tag: 'Ok' | 'Err';
	data: T | E;
}): response is { tag: 'Ok'; data: T } {
	return response.tag === 'Ok';
}

export function isErr<T, E>(response: {
	tag: 'Ok' | 'Err';
	data: T | E;
}): response is { tag: 'Err'; data: E } {
	return response.tag === 'Err';
}
