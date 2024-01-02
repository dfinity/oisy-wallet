import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import { syncWallet } from '$lib/services/ic-listener.services';
import type { PostMessage, PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';

export interface IcpWalletWorker {
	start: () => void;
	stop: () => void;
}

export const initIcpWalletWorker = async (): Promise<IcpWalletWorker> => {
	const WalletWorker = await import('$lib/workers/icp-wallet.worker?worker');
	const worker: Worker = new WalletWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<
		PostMessage<PostMessageDataResponseWallet<GetAccountIdentifierTransactionsResponse>>
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncIcpWallet':
				syncWallet({
					tokenId: ICP_TOKEN_ID,
					data: data.data as PostMessageDataResponseWallet<GetAccountIdentifierTransactionsResponse>
				});
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startIcpWalletTimer'
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopIcpWalletTimer'
			});
		}
	};
};
