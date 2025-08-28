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
	PostMessageDataRequest,
	PostMessageDataResponseError,
	PostMessageDataResponsePowProtectorNextAllowance,
	PostMessageDataResponsePowProtectorProgress
} from '$lib/types/post-message';

// TODO: add tests for POW worker/scheduler
export const initPowProtectorWorker: PowProtectorWorker =
	async (): Promise<PowProtectorWorkerInitResult> => {
		const PowWorker = await import('$lib/workers/workers?worker');
		let worker: Worker | null = new PowWorker.default();

		worker.onmessage = ({
			data: dataMsg
		}: MessageEvent<
			PostMessage<
				| PostMessageDataResponsePowProtectorProgress
				| PostMessageDataResponsePowProtectorNextAllowance
				| PostMessageDataResponseError
			>
		>) => {
			const { msg, data } = dataMsg;

			switch (msg) {
				case 'syncPowProgress': {
					syncPowProgress({
						data: data as PostMessageDataResponsePowProtectorProgress
					});
					return;
				}
				case 'syncPowNextAllowance': {
					// Check if data.data exists and has proper structure
					syncPowNextAllowance({
						data: data as PostMessageDataResponsePowProtectorNextAllowance
					});
					return;
				}
			}
		};

		const stop = () => {
			worker?.postMessage({
				msg: 'stopPowProtectionTimer'
			});
		};

		let isDestroying = false;

		return {
			start: () => {
				worker?.postMessage({
					msg: 'startPowProtectionTimer'
				} as PostMessage<PostMessageDataRequest>);
			},
			stop,
			trigger: () => {
				worker?.postMessage({
					msg: 'triggerPowProtectionTimer'
				} as PostMessage<PostMessageDataRequest>);
			},
			destroy: () => {
				if (isDestroying) {
					return;
				}
				isDestroying = true;
				stop();
				worker?.terminate();
				worker = null;
				isDestroying = false;
			}
		};
	};
