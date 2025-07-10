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

	const stop = () => {
		worker.postMessage({
			msg: 'stopBtcStatusesTimer'
		});
	};
	console.log('[Worker Init] Spawning new worker btcstatuses');

	return {
		start: () => {
			worker.postMessage({
				msg: 'startBtcStatusesTimer',
				data: {
					minterCanisterId
				}
			});
		},
		stop,
		trigger: () => {
			worker.postMessage({
				msg: 'triggerBtcStatusesTimer',
				data: {
					minterCanisterId
				}
			});
		},
		destroy: () => {
			console.log('Destroying worker btcstatuses');
			stop();
			worker.terminate();
		}
	};
};
