import {
	syncPowProtection,
	type PowProtectorWorker,
	type PowProtectorWorkerInitResult
} from '$icp/services/pow-protector-listener';
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageDataResponsePowProtector
} from '$lib/types/post-message';

// TODO: add tests for POW worker/scheduler
export const initPowProtectorWorker: PowProtectorWorker =
	async (): Promise<PowProtectorWorkerInitResult> => {
		const PowWorker = await import('$lib/workers/workers?worker');
		const worker: Worker = new PowWorker.default();

		worker.onmessage = ({
			data
		}: MessageEvent<
			PostMessage<PostMessageDataResponsePowProtector | PostMessageDataResponseError>
		>) => {
			const { msg } = data;

			switch (msg) {
				case 'syncPowProtection': {
					// Check if data.data exists and has proper structure
					if (data.data && 'progress' in data.data) {
						syncPowProtection({
							data: data.data
						});
					}
					return;
				}
			}
		};

		return {
			start: () => {
				worker.postMessage({
					msg: 'startPowProtectionTimer'
				});
			},
			stop: () => {
				worker.postMessage({
					msg: 'stopPowProtectionTimer'
				});
			},
			trigger: () => {
				worker.postMessage({
					msg: 'triggerPowProtectionTimer'
				});
			}
		};
	};
