import {
	onLoadStatusesError,
	syncPendingUtxos,
	syncStatuses
} from '$icp/services/ckbtc-listener.services';
import type { CkBTCWalletWorker } from '$icp/types/ckbtc-listener';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import type {
	PostMessage,
	PostMessageDataResponseBtcPendingUtxos,
	PostMessageDataResponseBtcStatuses,
	PostMessageDataResponseError
} from '$lib/types/post-message';

export const initCkBTCWalletWorker = async ({
	minterCanisterId,
	id: tokenId
}: IcToken & Partial<IcCkCanisters>): Promise<CkBTCWalletWorker> => {
	const CkBTCWalletWorker = await import('$icp/workers/ckbtc-wallet.worker?worker');
	const worker: Worker = new CkBTCWalletWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<
		PostMessage<
			| PostMessageDataResponseBtcStatuses
			| PostMessageDataResponseBtcPendingUtxos
			| PostMessageDataResponseError
		>
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncBtcStatuses':
				syncStatuses({
					tokenId,
					data: data.data as PostMessageDataResponseBtcStatuses
				});
				return;
			case 'syncBtcPendingUtxos':
				syncPendingUtxos({
					tokenId,
					data: data.data as PostMessageDataResponseBtcPendingUtxos
				});
				return;
			case 'syncBtcStatusesError':
				onLoadStatusesError({
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
