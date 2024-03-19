import { syncBtcPendingUtxos, syncCkBTCUpdateOk } from '$icp/services/ckbtc-listener.services';
import type { IcCkWorker, IcCkWorkerInitResult } from '$icp/types/ck-listener';
import type { IcCkToken } from '$icp/types/ic';
import type {
	PostMessage,
	PostMessageJsonDataResponse,
	PostMessageSyncState
} from '$lib/types/post-message';
import { emit } from '$lib/utils/events.utils';

export const initCkBTCUpdateBalanceWorker: IcCkWorker = async ({
	minterCanisterId,
	id: tokenId
}: IcCkToken): Promise<IcCkWorkerInitResult> => {
	const CkBTCUpdateBalanceWorker = await import('$icp/workers/ckbtc-update-balance.worker?worker');
	const worker: Worker = new CkBTCUpdateBalanceWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<PostMessage<PostMessageJsonDataResponse | PostMessageSyncState>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncBtcPendingUtxos':
				syncBtcPendingUtxos({
					tokenId,
					data: data.data as PostMessageJsonDataResponse
				});
				return;

			case 'syncCkBTCUpdateBalanceStatus':
				emit({
					message: 'oisyCkBtcUpdateBalance',
					detail: (data.data as PostMessageSyncState).state
				});
				return;
			case 'syncCkBTCUpdateOk':
				await syncCkBTCUpdateOk({
					tokenId,
					data: data.data as PostMessageJsonDataResponse
				});
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startCkBTCUpdateBalanceTimer',
				data: {
					minterCanisterId
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopCkBTCUpdateBalanceTimer'
			});
		},
		trigger: () => {
			// Do nothing, we do not restart the ckBtc update balance worker for any particular events.
			// When user execute it manually on the UI side, we display a progression in a modal therefore we do not have to execute it in the background.
		}
	};
};
