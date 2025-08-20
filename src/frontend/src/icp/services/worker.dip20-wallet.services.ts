import { syncWallet, syncWalletFromCache } from '$icp/services/ic-listener.services';
import {
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import type { IcToken } from '$icp/types/ic-token';
import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataRequestDip20,
	PostMessageDataResponseError,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp
} from '$lib/types/post-message';

export const initDip20WalletWorker = async ({
	ledgerCanisterId: canisterId,
	id: tokenId,
	network: { id: networkId }
}: IcToken): Promise<WalletWorker> => {
	const WalletWorker = await import('$lib/workers/workers?worker');
	let worker: Worker | null = new WalletWorker.default();

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
		worker?.postMessage({
			msg: 'stopDip20WalletTimer'
		});
	};

	let isDestroying = false;

	return {
		start: () => {
			worker?.postMessage({
				msg: 'startDip20WalletTimer',
				data: {
					canisterId
				}
			} as PostMessage<PostMessageDataRequestDip20>);
		},
		stop,
		trigger: () => {
			worker?.postMessage({
				msg: 'triggerDip20WalletTimer',
				data: {
					canisterId
				}
			} as PostMessage<PostMessageDataRequestDip20>);
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
