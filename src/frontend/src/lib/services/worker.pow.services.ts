import type {
	PostMessage,
	PostMessageDataRequestPowTimer,
	PostMessageDataResponseCreateChallenge
} from '$lib/types/post-message';

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

		switch (msg) {
			case 'createPowChallenge':
				// @ts-ignore

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
