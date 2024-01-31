import type { BtcStatusesWorker } from '$icp/types/btc-listener';
import type { IcCkCanisters, IcToken } from '$icp/types/ic';
import type {
	PostMessage,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp,
	PostMessageDataResponseWalletError
} from '$lib/types/post-message';
import type { IcrcGetTransactions } from '@dfinity/ledger-icrc';

export const initBtcStatusesWorker = async ({
	minterCanisterId,
	id: tokenId
}: IcToken & Partial<IcCkCanisters>): Promise<BtcStatusesWorker> => {
	const BtcStatusesWorker = await import('$icp/workers/btc-statuses.worker?worker');
	const worker: Worker = new BtcStatusesWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<
		PostMessage<
			| PostMessageDataResponseWallet<Omit<IcrcGetTransactions, 'transactions'>>
			| PostMessageDataResponseWalletError
			| PostMessageDataResponseWalletCleanUp
		>
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncBtcStatuses':
				// TODO
				return;
			case 'syncBtcStatusesError':
				// TODO
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
