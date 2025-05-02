import {
	syncPowProtection,
	syncPowProtectionError,
	type PowProtectorWorker,
	type PowProtectorWorkerInitResult
} from '$icp/types/pow-protector-listener';
import type {
	PostMessage,
	PostMessageDataResponse,
	PostMessageDataResponseError,
	PostMessageDataResponsePowProtector
} from '$lib/types/post-message';

// TODO: add tests for POW worker/scheduler
export const initPowProtectorWorker: PowProtectorWorker =
	async (): Promise<PowProtectorWorkerInitResult> => {
		const PowWorker = await import('$lib/workers/workers?worker');
		const worker: Worker = new PowWorker.default();

		worker.onmessage = ({ data: _data }: MessageEvent<PostMessage<PostMessageDataResponse>>) => {};

		worker.onmessage = ({
			data
		}: MessageEvent<
			PostMessage<PostMessageDataResponsePowProtector | PostMessageDataResponseError>
		>) => {
			const { msg } = data;

			switch (msg) {
				case 'syncPowProtection':
					syncPowProtection({
						_data: data.data as PostMessageDataResponsePowProtector
					});
					return;

				case 'syncPowProtectionError':
					syncPowProtectionError({
						_error: (data.data as PostMessageDataResponseError).error
					});
					return;
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
