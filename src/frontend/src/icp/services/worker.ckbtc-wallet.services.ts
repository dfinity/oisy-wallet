import {
	onLoadBtcStatusesError,
	onLoadCkBtcMinterInfoError,
	syncBtcPendingUtxos,
	syncBtcStatuses,
	syncCkBtcMinterInfo
} from '$icp/services/ckbtc-listener.services';
import type { CkBTCWalletWorker } from '$icp/types/ckbtc-listener';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import { waitAndTriggerWallet } from '$icp/utils/ic-wallet.utils';
import type {
	PostMessage,
	PostMessageDataResponseBtcPendingUtxos,
	PostMessageDataResponseBtcStatuses,
	PostMessageDataResponseError,
	PostMessageJsonDataResponseCkBTC
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
			| PostMessageJsonDataResponseCkBTC
			| PostMessageDataResponseBtcPendingUtxos
			| PostMessageDataResponseError
		>
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncBtcStatuses':
				syncBtcStatuses({
					tokenId,
					data: data.data as PostMessageDataResponseBtcStatuses
				});
				return;
			case 'syncBtcPendingUtxos':
				syncBtcPendingUtxos({
					tokenId,
					data: data.data as PostMessageDataResponseBtcPendingUtxos
				});
				return;
			case 'syncCkBtcUpdateOk':
				await waitAndTriggerWallet();
				return;
			case 'syncCktcMinterInfo':
				syncCkBtcMinterInfo({
					tokenId,
					data: data.data as PostMessageJsonDataResponseCkBTC
				});
				return;
			case 'syncBtcStatusesError':
				onLoadBtcStatusesError({
					tokenId,
					error: (data.data as PostMessageDataResponseError).error
				});
				return;
			case 'syncCktcMinterInfoError':
				onLoadCkBtcMinterInfoError({
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
