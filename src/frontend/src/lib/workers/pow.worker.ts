import {
	PostMessageAllowSigningResponseSchema,
	PostMessageCreatePowChallengeResponseSchema
} from '$lib/schema/post-message.schema';
import { solvePowChallenge } from '$lib/services/pow.services';
import type {
	PostMessage,
	PostMessageAllowSigningResponse,
	PostMessageCreatePowChallengeError,
	PostMessageCreatePowChallengeResponse,
	PostMessageCreatePowChallengeResponseData
} from '$lib/types/post-message';
import { isOk, routeWorkerResponse, sendMessageRequest } from '$lib/utils/worker.utils';
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

let powInProgress = false;

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
	if (
		isOk<PostMessageCreatePowChallengeResponseData, PostMessageCreatePowChallengeError>(
			createPowChallengeResponse
		)
	) {
		const challengeData = createPowChallengeResponse.data;
		nonce = await solvePowChallenge(challengeData.start_timestamp_ms, challengeData.difficulty);
	} else {
		const error = createPowChallengeResponse.data;
		console.error('PoW challenge error:', error);
		return;
	}

	// Step 2: AllowSigning
	const allowSigningResponse: PostMessageAllowSigningResponse =
		await sendMessageRequest<PostMessageAllowSigningResponse>(
			self as unknown as Worker,
			'AllowSigningRequest',
			{ nonce: BigInt(nonce) },
			PostMessageAllowSigningResponseSchema
		);

	if (isOk(allowSigningResponse)) {
		console.info('Allow signing successful:', allowSigningResponse.data);
	} else {
		console.error('Allow signing failed:', allowSigningResponse.data);
	}
}
