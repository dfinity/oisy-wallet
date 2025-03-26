import { createPowChallenge } from '$lib/api/backend.api';
import { SYNC_EXCHANGE_TIMER_INTERVAL } from '$lib/constants/exchange.constants';
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

const startPowTimer = async (data: PostMessageDataRequestExchangeTimer | undefined) => {
	// This worker has already been started
	if (nonNullish(timer)) {
		return;
	}

	let identity = await loadIdentity();
	const allow_signer = async () => await createPowChallenge(identity);

	await createPowChallenge(test_identity);

	timer = setInterval(allow_signer, SYNC_EXCHANGE_TIMER_INTERVAL);
};

const stopTimer = () => {
	if (isNullish(timer)) {
		return;
	}

	clearInterval(timer);
	timer = undefined;
};
