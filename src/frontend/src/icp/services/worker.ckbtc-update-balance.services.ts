import { syncBtcPendingUtxos, syncCkBTCUpdateOk } from '$icp/services/ckbtc-listener.services';
import { btcAddressStore } from '$icp/stores/btc.store';
import type { IcCkWorker, IcCkWorkerInitResult } from '$icp/types/ck-listener';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import type {
	PostMessage,
	PostMessageJsonDataResponse,
	PostMessageSyncState
} from '$lib/types/post-message';
import { emit } from '$lib/utils/events.utils';
import { get } from 'svelte/store';

export const initCkBTCUpdateBalanceWorker: IcCkWorker = async ({
	minterCanisterId,
	id: tokenId
}: IcToken & Partial<IcCkCanisters>): Promise<IcCkWorkerInitResult> => {
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
			// We can imperatively get the address because the worker fetches it, and we only provide it to reduce the number of calls. By doing so, we can adhere to our standard component abstraction for interacting with workers.
			const btcAddress = get(btcAddressStore)?.[tokenId]?.data;

			worker.postMessage({
				msg: 'startCkBTCUpdateBalanceTimer',
				data: {
					minterCanisterId,
					btcAddress
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
