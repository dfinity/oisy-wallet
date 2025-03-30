import { z } from 'zod';

type TaggedMessage<T> = {
	message: string;
	requestId: string;
	tag: 'Ok' | 'Err';
	data: T;
};

const responseHandlers = new Map<string, (data: unknown) => void>();

export function initWorkerMessageRouter(worker: Worker) {
	worker.onmessage = (event) => {
		const message = event.data;
		const { requestId } = message;
		const handler = responseHandlers.get(requestId);
		if (handler) {
			handler(message);
			responseHandlers.delete(requestId);
		}
	};
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
