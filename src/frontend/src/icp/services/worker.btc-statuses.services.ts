import { onLoadBtcStatusesError, syncBtcStatuses } from '$icp/services/ckbtc-listener.services';
import type { IcCkWorker, IcCkWorkerInitResult, IcCkWorkerParams } from '$icp/types/ck-listener';
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse,
	PostMessageSyncState
} from '$lib/types/post-message';

export const initBtcStatusesWorker: IcCkWorker = async ({
	minterCanisterId,
	token: { id: tokenId }
}: IcCkWorkerParams): Promise<IcCkWorkerInitResult> => {
	const BtcStatusesWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new BtcStatusesWorker.default();

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

	return {
		start: () => {
			worker.postMessage({
				msg: 'startBtcStatusesTimer',
				data: {
					minterCanisterId
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopBtcStatusesTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerBtcStatusesTimer',
				data: {
					minterCanisterId
				}
			});
		}
	};
};
