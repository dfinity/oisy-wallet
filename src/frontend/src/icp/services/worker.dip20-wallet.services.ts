import { syncWallet } from '$icp/services/ic-listener.services';
import {
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import type { IcToken } from '$icp/types/ic-token';
import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp
} from '$lib/types/post-message';

export const initDip20WalletWorker = async ({
	ledgerCanisterId,
	id: tokenId,
	network: { env }
}: IcToken): Promise<WalletWorker> => {
	const WalletWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new WalletWorker.default();

	worker.onmessage = ({
		data
	}: MessageEvent<
		PostMessage<
			| PostMessageDataResponseWallet
			| PostMessageDataResponseError
			| PostMessageDataResponseWalletCleanUp
		>
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncDip20Wallet':
				syncWallet({
					tokenId,
					data: data.data as PostMessageDataResponseWallet
				});
				return;
			case 'syncDip20WalletError':
				onLoadTransactionsError({
					tokenId,
					error: (data.data).error
				});

				return;
			case 'syncDip20WalletCleanUp':
				onTransactionsCleanUp({
					tokenId,
					transactionIds: (data.data as PostMessageDataResponseWalletCleanUp).transactionIds
				});
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startDip20WalletTimer',
				data: {
					ledgerCanisterId,
					env
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopDip20WalletTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerDip20WalletTimer',
				data: {
					ledgerCanisterId,
					env
				}
			});
		}
	};
};
