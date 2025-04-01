import { z } from 'zod';

type TaggedMessage<T> = {
	message: string;
	requestId: string;
	type: 'request' | 'response';
	isResponse: boolean;
	tag: 'Ok' | 'Err';
	data: T;
};

const responseHandlers = new Map<string, (data: unknown) => void>();

/*export function handleResponse(event: MessageEvent<TaggedMessage<PostMessageBase>>): boolean {
	let postMessageBase: PostMessageBase = PostMessageBaseSchema.parse(event);

	if (postMessageBase.type == 'response') {
		const handler = responseHandlers.get(postMessageBase.requestId);
		if (handler) {
			handler(postMessageBase.message);
			responseHandlers.delete(postMessageBase.requestId);
			return true;
		}
	}
	//
	return false;
}*/

export function initWorkerResponseRouter(worker: Worker) {
	worker.addEventListener('message', (event) => {
		const { type, requestId } = event.data;

		// Exit immediately if 'type' is missing or not equal to 'response'
		if (!type || type !== 'response') {
			console.error(`Invalid message type. Expected 'response', but got: ${type}`);
			return; // Exit execution early
		}

		console.log('Valid message received:', event.data);

		const handler = responseHandlers.get(requestId);
		if (handler) {
			handler(event);
			responseHandlers.delete(requestId);
		}
	});
}

/**
 * Sends a typed request to the worker and awaits the fully typed response envelope (T).
 */
export function sendMessageRequest<T>(
	worker: Worker,
	message: string,
	data: object,
	schema: z.ZodType<T>
): Promise<T> {
	const requestId = crypto.randomUUID();
	const payload = {
		message,
		requestId,
		tag: 'Ok' as const,
		type: 'request',
		data
	};

	return new Promise((resolve, reject) => {
		responseHandlers.set(requestId, (rawResponse) => {
			const parsed = schema.safeParse(rawResponse);
			if (!parsed.success) {
				console.error(`Invalid response for message '${message}':`, parsed.error.format());
				reject(parsed.error);
				return;
			}

			resolve(parsed.data);
		});

		worker.postMessage(payload);
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
