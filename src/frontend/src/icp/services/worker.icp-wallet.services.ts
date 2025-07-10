import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { syncWallet } from '$icp/services/ic-listener.services';
import {
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import type { WalletWorker } from '$lib/types/listener';
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp
} from '$lib/types/post-message';

export const initIcpWalletWorker = async (): Promise<WalletWorker> => {
	const WalletWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new WalletWorker.default();

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
					tokenId: ICP_TOKEN_ID,
					data: data as PostMessageDataResponseWallet
				});
				return;
			case 'syncIcpWalletError':
				onLoadTransactionsError({
					tokenId: ICP_TOKEN_ID,
					error: data.error
				});
				return;
			case 'syncIcpWalletCleanUp':
				onTransactionsCleanUp({
					tokenId: ICP_TOKEN_ID,
					transactionIds: (data as PostMessageDataResponseWalletCleanUp).transactionIds
				});
				return;
		}
	};

	const stop = () => {
		worker.postMessage({
			msg: 'stopIcpWalletTimer'
		});
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startIcpWalletTimer'
			});
		},
		stop,
		trigger: () => {
			worker.postMessage({
				msg: 'triggerIcpWalletTimer'
			});
		},
		destroy: () => {
			stop();
			worker.terminate();
		}
	};
};
