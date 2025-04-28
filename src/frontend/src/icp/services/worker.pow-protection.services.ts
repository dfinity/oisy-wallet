import type {
	PowProtectorWorker,
	PowProtectorWorkerInitResult
} from '$icp/types/pow-protector-listener';
import type { PostMessage, PostMessageDataResponse } from '$lib/types/post-message';

// TODO: add tests for POW worker/scheduler
export const initPowProtectorWorker: PowProtectorWorker =
	async (): Promise<PowProtectorWorkerInitResult> => {
		const PowWorker = await import('$lib/workers/workers?worker');
		const worker: Worker = new PowWorker.default();

		worker.onmessage = ({ data: _data }: MessageEvent<PostMessage<PostMessageDataResponse>>) => {};

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
