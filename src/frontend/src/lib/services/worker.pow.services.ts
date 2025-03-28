import { createPowChallenge } from '$lib/api/backend.api';
import { UserProfileNotFoundError } from '$lib/types/errors';
import type {
	PostMessage,
	PostMessageDataRequestPowTimer,
	PostMessageDataResponsePow
} from '$lib/types/post-message';
import { loadIdentity } from '$lib/utils/auth.utils';

export interface ChallengeWorker {
	startPowTimer: (params: PostMessageDataRequestPowTimer) => void;
	stopPowTimer: () => void;
	destroy: () => void;
}

let errorMessages: { msg: string; timestamp: number }[] = [];

export const initChallengeWorker = async (): Promise<ChallengeWorker> => {
	const PowWorker = await import('$lib/workers/workers?worker');
	const powWorker: Worker = new PowWorker.default();
	powWorker.onmessage = async ({ data }: MessageEvent<PostMessage<PostMessageDataResponsePow>>) => {
		const { msg, data: value } = data;

		switch (msg) {
			case 'createPowChallenge':
				await createPowChallengeService();
				return;
			case 'initSignerAllowance':
				await initSignerAllowance(value?.nonce as number);
				return;
		}
	};

	const createPowChallengeService = async () => {
		let identity = await loadIdentity();
		let response = await createPowChallenge({ identity });

		if ('Ok' in response) {
			powWorker.postMessage('solvePowChallenge', {
				startTimestampMs: response.Ok.start_timestamp_ms,
				difficulty: response.Ok.difficulty
			});
			return response.Ok;
		}
		const err = response.Err;
		if ('NotFound' in err) {
			throw new UserProfileNotFoundError();
		}
		throw new Error('Unknown error');
	};

	const initSignerAllowance = async (nonce: number) => {
		const response = await initSignerAllowance(nonce);
		powWorker.postMessage('allowSigner', response);
	};

	const stopTimer = () =>
		powWorker.postMessage({
			msg: 'stopPowTimer'
		});

	return {
		startPowTimer: (data: PostMessageDataRequestPowTimer) => {
			powWorker.postMessage({
				msg: 'startPowTimer',
				data
			});
		},
		stopPowTimer: stopTimer,
		destroy: () => {
			stopTimer();
			errorMessages = [];
		}
	};
};
