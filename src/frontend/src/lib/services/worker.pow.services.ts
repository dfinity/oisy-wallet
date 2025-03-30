import {
	PostMessageAllowSigningRequestSchema,
	PostMessageAllowSigningStatusSchema,
	PostMessageCreatePowChallengeRequestSchema
} from '$lib/schema/post-message.schema';
import { _allowSigning, _createPowChallenge } from '$lib/services/pow.services';
import { authStore } from '$lib/stores/auth.store';
import type {
	PostMessageAllowSigningRequest,
	PostMessageAllowSigningResponse,
	PostMessageCreatePowChallengeRequest,
	PostMessageCreatePowChallengeResponse
} from '$lib/types/post-message';
import { initWorkerMessageRouter } from '$lib/utils/worker.utils';
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
	initWorkerMessageRouter(worker);
	worker.onmessage = async (event) => {
		const raw = event.data;
		const { message } = raw;

		switch (message) {
			case 'CreatePowChallengeRequest': {
				const requestPostMessage = PostMessageCreatePowChallengeRequestSchema.safeParse(raw);
				if (!requestPostMessage.success) {
					console.error('Invalid AllowSigningMessageResponse', requestPostMessage.error.format());
					return null;
				}
				await handleCreatePowChallengeRequest(requestPostMessage.data);
				break;
			}

			case 'AllowSigningMessageRequest': {
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
			message: 'CreatePowChallengeResponse',
			requestId: parsedPostMessage.requestId,
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

		let allowSigningResponse = await _allowSigning({ identity });

		const response: PostMessageAllowSigningResponse = {
			message: 'AllowSigningResponse',
			requestId: parsedPostMessage.requestId,
			tag: 'Ok',
			data: {
				allowed_cycles: allowSigningResponse.allowed_cycles,
				challenge_completion: allowSigningResponse.challenge_completion,
				status: PostMessageAllowSigningStatusSchema.parse(allowSigningResponse.status)
			}
		};

		// send theResult_2
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
