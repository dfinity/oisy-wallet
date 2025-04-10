import {
	PostMessageAllowSigningResponseSchema,
	PostMessageCreatePowChallengeResponseSchema
} from '$lib/schema/post-message.schema';
import { solvePowChallenge } from '$lib/services/pow.services';
import type { PostMessageAllowSigningResponse, PostMessageCreatePowChallengeResponse } from '$lib/types/post-message';
import { routeWorkerResponse, sendMessageRequest } from '$lib/utils/worker.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const SCHEDULER_INTERVAL = 120_000;
// in ms, can be changed dynamically by sending message setPowThrottle
let _throttleRate = 20;

let timer: NodeJS.Timeout | undefined = undefined;

export const onPowMessage = (event: MessageEvent) => {
	console.warn('Received event data:', event.data);

	// this makes sure that the response is automatically routed back to the requester that initially published the message vent
	if (routeWorkerResponse(event)) {
		return;
	}
	const { msg } = event.data;

	switch (msg) {
		case 'stopPowTimer':
			stopPowTimer();
			return;
		case 'startPowTimer':
			startPowTimer();
			// execute the first call immediately
			allowSigning();
			return;
		case 'setPowThrottle':
			if (event.data?.throttleRate !== undefined && event.data.throttleRate !== 0) {
				_throttleRate = event.data._throttleRate;
			}
			break;
	}
};

const stopPowTimer = () => {
	if (isNullish(timer)) {
		return;
	}
	clearInterval(timer);
	timer = undefined;
};

const startPowTimer = () => {
	// This worker has already been started
	if (nonNullish(timer)) {
		return;
	}
	timer = setInterval(allowSigning, SCHEDULER_INTERVAL);
};

async function allowSigning() {
	// Step 1: Call CreatePoWChallenge
	const createPowChallengeResponse: PostMessageCreatePowChallengeResponse =
		await sendMessageRequest<PostMessageCreatePowChallengeResponse>({
			worker: self as unknown as Worker, // Pass as part of an object
			msg: 'CreatePowChallengeRequest',
			data: {}, // Empty object passed as data
			schema: PostMessageCreatePowChallengeResponseSchema
		});

	let nonce;
	// Step 2: Solve pow challenge
	if ('Ok' in createPowChallengeResponse.result) {
		const challengeData = createPowChallengeResponse.result.Ok;
		nonce = await solvePowChallenge({
			timestamp: challengeData.start_timestamp_ms,
			difficulty: challengeData.difficulty
		});
	} else if ('Err' in createPowChallengeResponse.result) {
		console.error('PoW challenge error:', createPowChallengeResponse.result.Err);
		return; // Exit on error
	}

	// Step 3: Call AllowSigning
	const allowSigningResponse: PostMessageAllowSigningResponse =
		await sendMessageRequest<PostMessageAllowSigningResponse>({
			worker: self as unknown as Worker,
			msg: 'AllowSigningRequest',
			data: { nonce },
			schema: PostMessageAllowSigningResponseSchema
		});

	if ('Ok' in allowSigningResponse.result) {
		console.warn('Allow signing successful:', allowSigningResponse.result.Ok);
	} else if ('Err' in allowSigningResponse.result) {
		console.warn('Allow signing failed:', allowSigningResponse.result.Err);
	}
}
