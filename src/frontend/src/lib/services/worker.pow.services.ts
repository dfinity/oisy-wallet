import { createPowChallenge } from '$lib/api/backend.api';
import type {
	PostMessage,
	PostMessageDataRequestPowTimer,
	PostMessageDataResponseCreateChallenge
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
	powWorker.onmessage = async ({
		data
	}: MessageEvent<PostMessage<PostMessageDataResponseCreateChallenge>>) => {
		const { msg, data: value } = data;
		let test_identity = await loadIdentity();

		switch (msg) {
			case 'createPowChallenge':
				// @ts-ignore
				await createPowChallenge(test_identity);
				return;
		}
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
