import {
	PostMessageAllowSigningResponseSchema,
	PostMessageCreatePowChallengeResponseSchema
} from '$lib/schema/post-message.schema';
import { solvePowChallenge } from '$lib/services/pow.services';
import type {
	PostMessage,
	PostMessageAllowSigningResponse,
	PostMessageCreatePowChallengeResponse
} from '$lib/types/post-message';
import { routeWorkerResponse, sendMessageRequest } from '$lib/utils/worker.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const FIRST_TIMER_INTERVAL = 60_000;

let timer: NodeJS.Timeout | undefined = undefined;

export const onPowMessage = async (event: MessageEvent<PostMessage<any>>) => {
	console.info('Received event data:', event.data);

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
			await startPowTimer();
			return;
	}
};

const stopPowTimer = () => {
	if (isNullish(timer)) {
		return;
	}
	clearInterval(timer);
	timer = undefined;
};

const startPowTimer = async () => {
	// This worker has already been started
	if (nonNullish(timer)) {
		return;
	}

	timer = setInterval(allowSigning, FIRST_TIMER_INTERVAL);
};

const powInProgress = false;

async function allowSigning() {
	// Step 1: CreatePoWChallenge
	const createPowChallengeResponse: PostMessageCreatePowChallengeResponse =
		await sendMessageRequest<PostMessageCreatePowChallengeResponse>(
			self as unknown as Worker,
			'CreatePowChallengeRequest',
			{},
			PostMessageCreatePowChallengeResponseSchema
		);

	let nonce;
	if ('Ok' in createPowChallengeResponse.result) {
		const challengeData = createPowChallengeResponse.result.Ok;
		nonce = await solvePowChallenge(challengeData.start_timestamp_ms, challengeData.difficulty);
	} else if ('Err' in createPowChallengeResponse.result) {
		console.error('PoW challenge error:', createPowChallengeResponse.result.Err);
		return; // Exit on error
	}

	// Step 2: AllowSigning
	const allowSigningResponse: PostMessageAllowSigningResponse =
		await sendMessageRequest<PostMessageAllowSigningResponse>(
			self as unknown as Worker,
			'AllowSigningRequest',
			{ nonce },
			PostMessageAllowSigningResponseSchema
		);

	if ('Ok' in allowSigningResponse.result) {
		console.info('Allow signing successful:', allowSigningResponse.result.Ok);
	} else if ('Err' in allowSigningResponse.result) {
		console.error('Allow signing failed:', allowSigningResponse.result.Err);
	}
}
