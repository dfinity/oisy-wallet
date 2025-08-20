import { syncWallet, syncWalletFromCache } from '$icp/services/ic-listener.services';
import {
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import type { IcToken } from '$icp/types/ic-token';
import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataRequestIcp,
	PostMessageDataResponseError,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp
} from '$lib/types/post-message';

export const initIcpWalletWorker = async ({
	indexCanisterId,
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
			case 'syncIcpWallet':
				syncWallet({
					tokenId,
					data: data as PostMessageDataResponseWallet
				});
				return;
			case 'syncIcpWalletError':
				onLoadTransactionsError({
					tokenId,
					error: data.error
				});
				return;
			case 'syncIcpWalletCleanUp':
				onTransactionsCleanUp({
					tokenId,
					transactionIds: (data as PostMessageDataResponseWalletCleanUp).transactionIds
				});
				return;
		}
	};

	const stop = () => {
		worker?.postMessage({
			msg: 'stopIcpWalletTimer'
		});
	};

	let isDestroying = false;

	return {
		start: () => {
			worker?.postMessage({
				msg: 'startIcpWalletTimer',
				data: {
					indexCanisterId
				}
			} as PostMessage<PostMessageDataRequestIcp>);
		},
		stop,
		trigger: () => {
			worker?.postMessage({
				msg: 'triggerIcpWalletTimer',
				data: {
					indexCanisterId
				}
			} as PostMessage<PostMessageDataRequestIcp>);
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
