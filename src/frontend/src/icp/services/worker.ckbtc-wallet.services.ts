import { onLoadBtcStatusesError, syncBtcStatuses } from '$icp/services/ckbtc-listener.services';
import type { IcCkWorker, IcCkWorkerInitResult } from '$icp/types/ck-listener';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageJsonDataResponse,
	PostMessageSyncState
} from '$lib/types/post-message';

export const initCkBTCWalletWorker: IcCkWorker = async ({
	minterCanisterId,
	id: tokenId
}: IcToken & Partial<IcCkCanisters>): Promise<IcCkWorkerInitResult> => {
	const CkBTCWalletWorker = await import('$icp/workers/ckbtc-wallet.worker?worker');
	const worker: Worker = new CkBTCWalletWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<
		PostMessage<PostMessageJsonDataResponse | PostMessageSyncState | PostMessageDataResponseError>
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncBtcStatuses':
				syncBtcStatuses({
					tokenId,
					data: data.data as PostMessageJsonDataResponse
				});
				return;
			case 'syncBtcStatusesError':
				onLoadBtcStatusesError({
					tokenId,
					error: (data.data as PostMessageDataResponseError).error
				});
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startCkBTCWalletTimer',
				data: {
					minterCanisterId
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopCkBTCWalletTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerCkBTCWalletTimer',
				data: {
					minterCanisterId
				}
			});
		}
	};
};
