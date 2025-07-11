import { syncWallet, syncWalletFromCache } from '$icp/services/ic-listener.services';
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
	network: { env, id: networkId }
}: IcToken): Promise<WalletWorker> => {
	const WalletWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new WalletWorker.default();

	await syncWalletFromCache({ tokenId, networkId });

	worker.onmessage = ({
		data: dataMsg
	}: MessageEvent<
		PostMessage<
			| PostMessageDataResponseWallet
			| PostMessageDataResponseError
			| PostMessageDataResponseWalletCleanUp
		>
	>) => {
		const { msg, data } = dataMsg;

		switch (msg) {
			case 'syncDip20Wallet':
				syncWallet({
					tokenId,
					data: data as PostMessageDataResponseWallet
				});
				return;
			case 'syncDip20WalletError':
				onLoadTransactionsError({
					tokenId,
					error: data.error
				});

				return;
			case 'syncDip20WalletCleanUp':
				onTransactionsCleanUp({
					tokenId,
					transactionIds: (data as PostMessageDataResponseWalletCleanUp).transactionIds
				});
				return;
		}
	};

	const stop = () => {
		worker.postMessage({
			msg: 'stopDip20WalletTimer'
		});
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
		stop,
		trigger: () => {
			worker.postMessage({
				msg: 'triggerDip20WalletTimer',
				data: {
					ledgerCanisterId,
					env
				}
			});
		},
		destroy: () => {
			stop();
			worker.terminate();
		}
	};
};
