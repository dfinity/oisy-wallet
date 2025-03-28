import { solvePowChallenge } from '$lib/services/pow.services';
import type {
	PostMessage,
	PostMessageDataRequestPowAllowSigner,
	PostMessageDataRequestPowTimer,
	PostMessageDataRequestSolvePowChallenge
} from '$lib/types/post-message';
import { isNullish, nonNullish } from '@dfinity/utils';

export const FIRST_TIMER_INTERVAL = 5000;

export const onPowMessage = async ({
	data
}: MessageEvent<
	PostMessage<
		| PostMessageDataRequestPowTimer
		| PostMessageDataRequestSolvePowChallenge
		| PostMessageDataRequestPowAllowSigner
	>
>) => {
	const { msg, data: payload } = data;

	switch (msg) {
		case 'stopPowTimer':
			stopTimer();
			return;
		case 'startPowTimer':
			await startPowTimer(payload as PostMessageDataRequestPowTimer);
			return;
		case 'solvePowChallenge':
			await solvePowChallengeLocal(payload as PostMessageDataRequestSolvePowChallenge);
			return;
		case 'allowSigner':
			await allowSigner(payload as PostMessageDataRequestPowAllowSigner);
	}
};

let timer: NodeJS.Timeout | undefined = undefined;

const solvePowChallengeLocal = async (
	data: PostMessageDataRequestSolvePowChallenge | undefined
) => {
	if (data?.startTimestampMs && data.difficulty) {
		const nonce = await solvePowChallenge(data.startTimestampMs, data.difficulty);

		postMessage('initSignerAllowance', nonce);
	} else {
		// todo: what if data is undefined?
	}
};

const allowPowSigning = async () => {
	postMessage('createPowChallenge');
};

const allowSigner = async (data: PostMessageDataRequestPowAllowSigner | undefined) => {
	// todo: handle
};

const startPowTimer = async (data: PostMessageDataRequestPowTimer | undefined) => {
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
