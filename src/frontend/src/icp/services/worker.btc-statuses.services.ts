import { onLoadBtcStatusesError, syncBtcStatuses } from '$icp/services/ckbtc-listener.services';
import type { IcCkWorker, IcCkWorkerInitResult, IcCkWorkerParams } from '$icp/types/ck-listener';
import type {
	PostMessage,
	PostMessageDataRequestIcCk,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse,
	PostMessageSyncState
} from '$lib/types/post-message';

export const initBtcStatusesWorker: IcCkWorker = async ({
	minterCanisterId,
	token: { id: tokenId }
}: IcCkWorkerParams): Promise<IcCkWorkerInitResult> => {
	const BtcStatusesWorker = await import('$lib/workers/workers?worker');
	let worker: Worker | null = new BtcStatusesWorker.default();

	worker.onmessage = ({
		data: dataMsg
	}: MessageEvent<
		PostMessage<PostMessageJsonDataResponse | PostMessageSyncState | PostMessageDataResponseError>
	>) => {
		const { msg, data } = dataMsg;

		switch (msg) {
			case 'syncBtcStatuses':
				syncBtcStatuses({
					tokenId,
					data: data as PostMessageJsonDataResponse
				});
				return;
			case 'syncBtcStatusesError':
				onLoadBtcStatusesError({
					tokenId,
					error: data.error
				});
				return;
		}
	};

	const stop = () => {
		worker?.postMessage({
			msg: 'stopBtcStatusesTimer'
		});
	};

	let isDestroying = false;

	return {
		start: () => {
			worker?.postMessage({
				msg: 'startBtcStatusesTimer',
				data: {
					minterCanisterId
				}
			} as PostMessage<PostMessageDataRequestIcCk>);
		},
		stop,
		trigger: () => {
			worker?.postMessage({
				msg: 'triggerBtcStatusesTimer',
				data: {
					minterCanisterId
				}
			} as PostMessage<PostMessageDataRequestIcCk>);
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
