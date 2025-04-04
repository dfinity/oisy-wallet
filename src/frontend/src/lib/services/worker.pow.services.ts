import type { AllowSigningRequest } from '$declarations/backend/backend.did';
import { allowSigning } from '$lib/api/backend.api';
import { mapAllowSigningError } from '$lib/canisters/backend.errors';
import {
	PostMessageAllowSigningRequestSchema,
	PostMessageAllowSigningResponseDataSchema,
	PostMessageCreatePowChallengeRequestSchema
} from '$lib/schema/post-message.schema';
import { _createPowChallenge } from '$lib/services/pow.services';
import { authStore } from '$lib/stores/auth.store';
import type {
	PostMessageAllowSigningRequest,
	PostMessageAllowSigningResponse,
	PostMessageCreatePowChallengeRequest,
	PostMessageCreatePowChallengeResponse
} from '$lib/types/post-message';
import { get } from 'svelte/store';

export interface BaseWorker {
	startPowWorker: () => void;
	stopPowWorker: () => void;
	destroyPowWorker: () => void;
}

let errorMessages: { msg: string; timestamp: number }[] = [];

export const initPowWorker = async (): Promise<BaseWorker> => {
	const PowWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new PowWorker.default();
	//initWorkerResponseRouter(worker);
	worker.onmessage = async (event) => {
		const raw = event.data;
		const { msg } = raw;

		switch (msg) {
			// handle any response first and skip further processing

			case 'CreatePowChallengeRequest': {
				const requestPostMessage = PostMessageCreatePowChallengeRequestSchema.safeParse(raw);
				if (!requestPostMessage.success) {
					console.error('Invalid AllowSigningMessageResponse', requestPostMessage.error.format());
					return null;
				}
				await handleCreatePowChallengeRequest(requestPostMessage.data);
				break;
			}

			case 'AllowSigningRequest': {
				const requestPostMessage = PostMessageAllowSigningRequestSchema.safeParse(raw);
				if (!requestPostMessage.success) {
					console.error('Invalid AllowSigningMessageResponse', requestPostMessage.error.format());
					return null;
				}
				await handleAllowSigningRequest(requestPostMessage.data);
				break;
			}
		}
	};

	const handleCreatePowChallengeRequest = async (
		parsedPostMessage: PostMessageCreatePowChallengeRequest
	) => {
		const { identity } = get(authStore);

		let allowSigningResponse = await _createPowChallenge({ identity });

		const response: PostMessageCreatePowChallengeResponse = {
			msg: 'CreatePowChallengeResponse',
			requestId: parsedPostMessage.requestId,
			type: 'response',
			tag: 'Ok',
			data: {
				difficulty: allowSigningResponse.difficulty,
				start_timestamp_ms: allowSigningResponse.start_timestamp_ms,
				expiry_timestamp_ms: allowSigningResponse.expiry_timestamp_ms
			}
		};

		worker.postMessage(response);
	};

	const handleAllowSigningRequest = async (parsedPostMessage: PostMessageAllowSigningRequest) => {
		// we call the api service to allow the requested cycles
		// const request: AllowSigningRequest = {
		//	nonce: nonce ?? 0n
		//};
		const { identity } = get(authStore);

		let allowSigningRequest: AllowSigningRequest = {
			nonce: parsedPostMessage.data.nonce
		};
		const result = await allowSigning({ identity, request: allowSigningRequest });

		if ('Err' in result) {
			throw mapAllowSigningError(result.Err);
		}

		const response: PostMessageAllowSigningResponse = {
			msg: 'AllowSigningResponse',
			requestId: parsedPostMessage.requestId,
			type: 'response',
			tag: 'Ok',
			data: PostMessageAllowSigningResponseDataSchema.parse(result)
		};

		// send response
		worker.postMessage(response);
	};

	const stopPowTimer = () =>
		worker.postMessage({
			msg: 'stopPowTimer'
		});

	return {
		startPowWorker: () => {
			worker.postMessage({
				msg: 'startPowTimer'
			});
		},
		stopPowWorker: stopPowTimer,
		destroyPowWorker: () => {
			stopPowTimer();
			errorMessages = [];
		}
	};
};
