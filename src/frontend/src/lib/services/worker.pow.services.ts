import { idleSignOut } from '$lib/services/auth.services';
import { authRemainingTimeStore } from '$lib/stores/auth.store';
import type {
	PostMessage,
	PostMessageDataRequestExchangeTimer,
	PostMessageDataResponseCreateChallenge
} from '$lib/types/post-message';

export interface ChallengeWorker {
	startExchangeTimer: (params: PostMessageDataRequestExchangeTimer) => void;
	stopExchangeTimer: () => void;
	destroy: () => void;
}

let errorMessages: { msg: string; timestamp: number }[] = [];

export const initChallengeWorker = async (): Promise<ChallengeWorker> => {
	const PowExchangeWorker = await import('$lib/workers/workers?worker');
	const powWorker: Worker = new PowExchangeWorker.default();
	powWorker.onmessage = async ({
		data
	}: MessageEvent<PostMessage<PostMessageDataResponseCreateChallenge>>) => {
		const { msg, data: value } = data;

		switch (msg) {
			case 'signOutIdleTimer':
				await idleSignOut();
				return;
			case 'delegationRemainingTime':
				authRemainingTimeStore.set(value?.authRemainingTime);
				return;
		}
	};

	const stopTimer = () =>
		powWorker.postMessage({
			msg: 'stopExchangeTimer'
		});

	return {
		startExchangeTimer: (data: PostMessageDataRequestExchangeTimer) => {
			powWorker.postMessage({
				msg: 'startExchangeTimer',
				data
			});
		},
		stopExchangeTimer: stopTimer,
		destroy: () => {
			stopTimer();
			errorMessages = [];
		}
	};
};
