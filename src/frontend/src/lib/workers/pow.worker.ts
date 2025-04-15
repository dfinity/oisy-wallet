import type { PostMessageAllowSigningResponse, PostMessageCreatePowChallengeResponse } from '$lib/types/post-message';
import { isNullish, nonNullish } from '@dfinity/utils';
import {
	PostMessageAllowSigningResponseSchema,
	PostMessageCreatePowChallengeResponseSchema
} from '../schema/post-message.schema';
import { solvePowChallenge } from '../services/pow.services';
import { routeWorkerResponse, sendMessageRequest } from '../utils/worker.utils';

export const SCHEDULER_INTERVAL = 120_000;
// in ms, can be changed dynamically by sending message setPowThrottle
let _throttleRate = 20;

let timer: NodeJS.Timeout | undefined = undefined;

export const onPowMessage = async (event: MessageEvent) => {
	console.warn('Received event data:', event.data);

	// auto-route responses back to original requesters
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
			await requestSignerCycles();
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
	timer = setInterval(requestSignerCycles, SCHEDULER_INTERVAL);
};

/**
 * Initiates Proof-of-Work and signing processes sequentially.
 * This function coordinates:
 * 1. Creation of a PoW challenge.
 * 2. Solving the PoW challenge.
 * 3. Requesting allowance for signing using the solved nonce.
 *
 * Errors at any stage lead to early returns with appropriate logging.
 */
async function requestSignerCycles(): Promise<void> {
	const challengeData = await createPoWChallenge();
	if (!challengeData) {
		// error already logged in createPoWChallenge
		return;
	}

	const nonce = await solvePowChallenge({
		timestamp: challengeData.start_timestamp_ms,
		difficulty: challengeData.difficulty
	});

	await requestAllowSigning(nonce);
}

/**
 * Requests creation of the Proof-of-Work (PoW) challenge.
 * Logs the error if unsuccessful.
 *
 * @returns Challenge data on success, null otherwise.
 */
async function createPoWChallenge() {
	const response: PostMessageCreatePowChallengeResponse = await sendMessageRequest({
		worker: self as unknown as Worker,
		msg: 'CreatePowChallengeRequest',
		data: {},
		schema: PostMessageCreatePowChallengeResponseSchema
	});

	if ('Ok' in response.result) {
		return response.result.Ok;
	}

	console.error('PoW challenge error:', response.result.Err);
	return null;
}

/**
 * Requests allowance for signing operations with solved nonce.
 *
 * @param nonce - The computed result from the solved PoW challenge.
 */
async function requestAllowSigning(nonce: number) {
	const signingResponse: PostMessageAllowSigningResponse = await sendMessageRequest({
		worker: self as unknown as Worker,
		msg: 'AllowSigningRequest',
		data: { nonce },
		schema: PostMessageAllowSigningResponseSchema
	});

	// TODO remove this statement
	if ('Ok' in signingResponse.result) {
		// console.info('Allow signing successful:', signingResponse.result.Ok);
		return;
	}

	if ('Err' in signingResponse.result) {
		console.warn('Allow signing failed:', signingResponse.result.Err);
	}
}
