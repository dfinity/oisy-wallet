import { solvePowChallenge } from '$lib/services/pow.services';

export const FIRST_TIMER_INTERVAL = 30_000;

import {
	PostMessageAllowSigningResponseSchema,
	PostMessageCreatePowChallengeResponseSchema
} from '$lib/schema/post-message.schema';
import type {
	PostMessageAllowSigningResponse,
	PostMessageCreatePowChallengeError,
	PostMessageCreatePowChallengeResponse,
	PostMessageCreatePowChallengeResponseData
} from '$lib/types/post-message';
import { isOk, sendMessageRequest } from '$lib/utils/worker.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

let timer: NodeJS.Timeout | undefined = undefined;
export const onPowMessage = async ({ data }: MessageEvent) => {
	const { msg, data: payload } = data;

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

	if (
		isOk<PostMessageCreatePowChallengeResponseData, PostMessageCreatePowChallengeError>(
			createPowChallengeResponse
		)
	) {
		const challengeData = createPowChallengeResponse.data;
		await solvePowChallenge(challengeData.start_timestamp_ms, challengeData.difficulty);
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
			{ nonce: BigInt(Date.now()) },
			PostMessageAllowSigningResponseSchema
		);

	if (isOk(allowSigningResponse)) {
		console.info('Allow signing successful:', allowSigningResponse.data);
	} else {
		console.error('Allow signing failed:', allowSigningResponse.data);
	}
}
