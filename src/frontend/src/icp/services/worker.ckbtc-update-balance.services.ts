import {
	syncBtcAddress,
	syncBtcPendingUtxos,
	syncCkBTCUpdateOk
} from '$icp/services/ckbtc-listener.services';
import { btcAddressStore } from '$icp/stores/btc.store';
import type { IcCkWorker, IcCkWorkerInitResult, IcCkWorkerParams } from '$icp/types/ck-listener';
import type {
	PostMessage,
	PostMessageDataRequestIcCkBTCUpdateBalance,
	PostMessageDataResponseBTCAddress,
	PostMessageJsonDataResponse,
	PostMessageSyncState
} from '$lib/types/post-message';
import { emit } from '$lib/utils/events.utils';
import { isNetworkIdBTCMainnet } from '$lib/utils/network.utils';
import { get } from 'svelte/store';

export const initCkBTCUpdateBalanceWorker: IcCkWorker = async ({
	minterCanisterId,
	token: { id: tokenId },
	twinToken
}: IcCkWorkerParams): Promise<IcCkWorkerInitResult> => {
	const CkBTCUpdateBalanceWorker = await import('$lib/workers/workers?worker');
	let worker: Worker | null = new CkBTCUpdateBalanceWorker.default();

	worker.onmessage = async ({
		data: dataMsg
	}: MessageEvent<
		PostMessage<
			PostMessageJsonDataResponse | PostMessageSyncState | PostMessageDataResponseBTCAddress
		>
	>) => {
		const { msg, data } = dataMsg;

		switch (msg) {
			case 'syncBtcPendingUtxos':
				syncBtcPendingUtxos({
					tokenId,
					data: data as PostMessageJsonDataResponse
				});
				return;
			case 'syncCkBTCUpdateBalanceStatus':
				emit({
					message: 'oisyCkBtcUpdateBalance',
					detail: (data as PostMessageSyncState).state
				});
				return;
			case 'syncBtcAddress':
				syncBtcAddress({
					tokenId,
					data: data as PostMessageDataResponseBTCAddress
				});
				return;
			case 'syncCkBTCUpdateOk':
				await syncCkBTCUpdateOk({
					tokenId,
					data: data as PostMessageJsonDataResponse
				});
				return;
		}
	};

	const stop = () => {
		worker?.postMessage({
			msg: 'stopCkBTCUpdateBalanceTimer'
		});
	};

	let isDestroying = false;

	return {
		start: () => {
			// We can imperatively get the address because the worker fetches it, and we only provide it to reduce the number of calls. By doing so, we can adhere to our standard component abstraction for interacting with workers.
			const btcAddress = get(btcAddressStore)?.[tokenId]?.data;

			worker?.postMessage({
				msg: 'startCkBTCUpdateBalanceTimer',
				data: {
					minterCanisterId,
					btcAddress,
					bitcoinNetwork: isNetworkIdBTCMainnet(twinToken?.network.id) ? 'mainnet' : 'testnet'
				}
			} as PostMessage<PostMessageDataRequestIcCkBTCUpdateBalance>);
		},
		stop,
		trigger: () => {
			// Do nothing, we do not restart the ckBtc update balance worker for any particular events.
			// When a user executes it manually on the UI side, we display a progression in a modal therefore we do not have to execute it in the background.
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
