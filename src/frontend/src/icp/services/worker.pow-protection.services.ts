import {
	syncPowNextAllowance,
	syncPowProgress
} from '$icp/services/pow-protector-listener.services';
import type {
	PowProtectorWorker,
	PowProtectorWorkerInitResult
} from '$icp/types/pow-protector-listener';
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageDataResponsePowProtectorNextAllowance,
	PostMessageDataResponsePowProtectorProgress
} from '$lib/types/post-message';

// TODO: add tests for POW worker/scheduler
export const initPowProtectorWorker: PowProtectorWorker =
	async (): Promise<PowProtectorWorkerInitResult> => {
		const PowWorker = await import('$lib/workers/workers?worker');
		const worker: Worker = new PowWorker.default();

		worker.onmessage = ({
			data
		}: MessageEvent<
			PostMessage<
				| PostMessageDataResponsePowProtectorProgress
				| PostMessageDataResponsePowProtectorNextAllowance
				| PostMessageDataResponseError
			>
		>) => {
			const { msg } = data;

			switch (msg) {
				case 'syncPowProgress': {
					syncPowProgress({
						data: data.data as PostMessageDataResponsePowProtectorProgress
					});
					return;
				}
				case 'syncPowNextAllowance': {
					// Check if data.data exists and has proper structure
					syncPowNextAllowance({
						data: data.data as PostMessageDataResponsePowProtectorNextAllowance
					});
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
