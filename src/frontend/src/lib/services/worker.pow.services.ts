import type { PostMessage, PostMessageDataResponse } from '$lib/types/post-message';

export interface BaseWorker {
	startPowWorker: () => void;
	stopPowWorker: () => void;
	// TODO: check if this is used
	destroyPowWorker: () => void;
}

export const initPowWorker = async (): Promise<BaseWorker> => {
	const PowWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new PowWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<
		// TODO: adapt this type to the correct data response
		PostMessage<PostMessageDataResponse>
		// eslint-disable-next-line require-await
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'powCreateChallengeRequest': {
				// TODO: create a function to handle the challenge request
				return;
			}
			case 'powAllowSigningRequest': {
				// TODO: create a function to handle the allow signing request
				return;
			}
		}
	};

	const stopPowTimer = () =>
		worker.postMessage({
			msg: 'stopPowTimer'
		});

	return {
		startPowWorker: () => {
			worker.postMessage({
				msg: 'startPowTimer'
			});
		},
		stopPowWorker: stopPowTimer,
		destroyPowWorker: () => {
			stopPowTimer();
		}
	};
};
