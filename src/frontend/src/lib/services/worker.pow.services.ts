import type {
	Result_2 as AllowSigningResult,
	Result_6 as CreateChallengeResult
} from '$declarations/backend/backend.did';
import {
	AllowSigningResponseResultSchema,
	CreatePowChallengeResponseResultSchema
} from '$lib/schema/post-message.schema';
import { _allowSigning, _createPowChallenge } from '$lib/services/pow.services';
import { authStore } from '$lib/stores/auth.store';
import type {
	PostMessageAllowSigningRequest,
	PostMessageAllowSigningResponse,
	PostMessageCreatePowChallengeRequest,
	PostMessageCreatePowChallengeResponse
} from '$lib/types/post-message';
import { get } from 'svelte/store';
import type { ZodType } from 'zod';

/**
 * Maps a canister response to its corresponding schema result, validating the schema and handling both `Ok` and `Err` cases.
 * Includes logic for transforming `Err` to a human-readable string.
 * @param response - The canister response to map.
 * @param schema - The Zod schema used to validate the `Ok` part of the response.
 * @returns The mapped response object.
 * @throws Will throw an error if the validation fails.
 */
function mapCanisterResponse<T>(
	response: { Ok?: T; Err?: any }, // Allow `Ok` or `Err` as part of the response structure
	schema: ZodType<T> // Schema only applies to the `Ok` part
): { Ok: T } | { Err: string } {
	if ('Err' in response) {
		const err = response.Err;
		if ('ChallengeInProgress' in err) {
			return { Err: 'Challenge is already in progress.' };
		}
		if ('Unauthorized' in err) {
			return { Err: 'Unauthorized request.' };
		}
		if ('Other' in err && typeof err.Other === 'string') {
			return { Err: err.Other };
		}
		return { Err: 'Unknown error.' };
	}

	if (response.Ok) {
		// Validate only the `Ok` part of the response
		const validationResult = schema.safeParse(response.Ok);
		if (!validationResult.success) {
			throw new Error(`Response validation failed: ${validationResult.error.message}`);
		}
		return { Ok: validationResult.data };
	}

	// Provide an appropriate fallback in case `Ok` is missing and `Err` isn't present
	return { Err: 'Unexpected response structure.' };
}

export interface BaseWorker {
	startPowWorker: () => void;
	stopPowWorker: () => void;
	destroyPowWorker: () => void;
}

export const initPowWorker = async (): Promise<BaseWorker> => {
	const PowWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new PowWorker.default();

	worker.onmessage = async (event) => {
		const raw = event.data;

		switch (raw.msg) {
			case 'CreatePowChallengeRequest': {
				await handleCreatePowChallengeRequest(raw);
				break;
			}
			case 'AllowSigningRequest': {
				await handleAllowSigningRequest(raw);
				break;
			}
		}
	};

	const handleCreatePowChallengeRequest = async (
		parsedPostMessage: PostMessageCreatePowChallengeRequest
	) => {
		const { identity } = get(authStore);

		const response: CreateChallengeResult = await _createPowChallenge({ identity });

		const postMessageResponse: PostMessageCreatePowChallengeResponse = {
			msg: 'CreatePowChallengeResponse',
			requestId: parsedPostMessage.requestId,
			type: 'response',
			result: mapCanisterResponse(response, CreatePowChallengeResponseResultSchema)
		};

		worker.postMessage(postMessageResponse);
	};

	const handleAllowSigningRequest = async (parsedPostMessage: PostMessageAllowSigningRequest) => {
		const { identity } = get(authStore);

		const response: AllowSigningResult = await _allowSigning({
			identity,
			request: parsedPostMessage.data
		});

		const postMessageResponse: PostMessageAllowSigningResponse = {
			msg: 'AllowSigningResponse',
			requestId: parsedPostMessage.requestId,
			type: 'response',
			result: mapCanisterResponse(response, AllowSigningResponseResultSchema)
		};

		worker.postMessage(postMessageResponse);
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
		}
	};
};
