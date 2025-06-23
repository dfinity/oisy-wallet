import {
	syncPowNextAllowance,
	syncPowProgress,
	type PowProtectorWorker,
	type PowProtectorWorkerInitResult
} from '$icp/services/pow-protector-listener';
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageDataResponsePowProtectorNextAllowance,
	PostMessageDataResponsePowProtectorProgress
} from '$lib/types/post-message';
import { assertNonNullish } from '@dfinity/utils';

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
			assertNonNullish(data.data);

			switch (msg) {
				case 'syncPowProgress': {
					// Check if data.data exists and has proper structure
					if ('progress' in data.data) {
						syncPowProgress({
							data: data.data
						});
					}
					return;
				}
				case 'syncPowNextAllowance': {
					// Check if data.data exists and has proper structure
					if ('nextAllowanceMs' in data.data) {
						syncPowNextAllowance({
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
