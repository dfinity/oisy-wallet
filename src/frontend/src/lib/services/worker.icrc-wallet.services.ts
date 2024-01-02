import { syncWallet } from '$lib/services/ic-listener.services';
import type { IcToken } from '$lib/types/ic';
import type { PostMessage, PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { IcrcGetTransactions } from '@dfinity/ledger-icrc';

export interface WalletWorker {
	start: () => void;
	stop: () => void;
}

export const initIcrcWalletWorker = async ({
	indexCanisterId,
	id: tokenId
}: IcToken): Promise<WalletWorker> => {
	const WalletWorker = await import('$lib/workers/icrc-wallet.worker?worker');
	const worker: Worker = new WalletWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<PostMessage<PostMessageDataResponseWallet<IcrcGetTransactions>>>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncIcrcWallet':
				syncWallet({
					tokenId,
					data: data.data as PostMessageDataResponseWallet<IcrcGetTransactions>
				});
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startIcrcWalletTimer',
				data: {
					indexCanisterId
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopIcrcWalletTimer'
			});
		}
	};
};
