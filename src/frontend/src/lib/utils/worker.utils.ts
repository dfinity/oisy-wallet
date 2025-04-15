import type { PostMessageRequestBase } from '$lib/types/post-message';
import type { z } from 'zod';

const responseHandlers = new Map<string, (data: unknown) => void>();

export function routeWorkerResponse(event: MessageEvent): boolean {
	//const { type } = event.data;
	const { type, requestId } = event.data;

	// Exit immediately if 'type' is missing or not equal to 'response'
	if (!type || type !== 'response') {
		// console.error("Invalid message type. Expected 'response', but got:", event.data);
		return false;
	}

	const handler = responseHandlers.get(requestId);
	if (handler) {
		handler(event.data);
		responseHandlers.delete(requestId);
		return true;
	}
	console.warn('No handler found for event', requestId);
	return false;
}

/**
 * Sends a typed request to the worker and awaits the fully typed response envelope (T).
 */
export function sendMessageRequest<T>({
																				worker,
																				msg,
																				data,
																				schema
																			}: {
	worker: Worker;
	msg: string;
	data: object;
	schema: z.ZodType<T>;
}): Promise<T> {
	const requestId = crypto.randomUUID();

	// Explicitly type the payload as PostMessageRequestBase
	const payload: PostMessageRequestBase = {
		msg,
		requestId,
		type: 'request',
		data
	};

	return new Promise((resolve, reject) => {
		responseHandlers.set(requestId, (rawResponse: unknown) => {
			const parsed = schema.safeParse(rawResponse as PostMessageRequestBase);
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
