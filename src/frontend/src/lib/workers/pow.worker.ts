import { createPowChallenge } from '$lib/api/backend.api';
import { initSignerAllowance } from '$lib/services/loader.services';
import { solvePowChallenge } from '$lib/services/pow.services';
import { UserProfileNotFoundError } from '$lib/types/errors';
import type {
	PostMessage,
	PostMessageDataRequest,
	PostMessageDataRequestExchangeTimer
} from '$lib/types/post-message';
import { loadIdentity } from '$lib/utils/auth.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const FIRST_TIMER_INTERVAL = 5000;

export const onPowMessage = async ({
	data
	// eslint-disable-next-line require-await
}: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg, data: payload } = data;

	switch (msg) {
		case 'stopPowTimer':
			stopTimer();
			return;
		case 'startPowTimer':
			await startPowTimer(payload);
			return;
	}
};

let timer: NodeJS.Timeout | undefined = undefined;

const allowPowSigning = async () => {
	let identity = await loadIdentity();
	let response = await createPowChallenge({ identity });
	console.log(JSON.stringify(response));
	if ('Ok' in response) {
		let nonce = await solvePowChallenge(response.Ok.start_timestamp_ms, response.Ok.difficulty);
		await initSignerAllowance(BigInt(nonce));
		return response.Ok;
	}
	const err = response.Err;
	if ('NotFound' in err) {
		throw new UserProfileNotFoundError();
	}
	throw new Error('Unknown error');
};

const startPowTimer = async (data: PostMessageDataRequestExchangeTimer | undefined) => {
	// This worker has already been started
	if (nonNullish(timer)) {
		return;
	}
	timer = setInterval(allowPowSigning, FIRST_TIMER_INTERVAL);
};

const stopTimer = () => {
	if (isNullish(timer)) {
		return;
	}

	clearInterval(timer);
	timer = undefined;
};
