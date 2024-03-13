import { ICP_TOKEN_ID } from '$env/tokens.env';
import {
	onLoadTransactionsError,
	onTransactionsCleanUp
} from '$icp/services/ic-transactions.services';
import type { WalletWorker } from '$icp/types/ic-listener';
import type {
	PostMessage,
	PostMessageDataResponseError,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp
} from '$lib/types/post-message';
import type { GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
import { syncWallet } from './ic-listener.services';

export const initIcpWalletWorker = async (): Promise<WalletWorker> => {
	const WalletWorker = await import('$icp/workers/icp-wallet.worker?worker');
	const worker: Worker = new WalletWorker.default();

	worker.onmessage = async ({
		data
	}: MessageEvent<
		PostMessage<
			| PostMessageDataResponseWallet<
					Omit<GetAccountIdentifierTransactionsResponse, 'transactions'>
			  >
			| PostMessageDataResponseError
			| PostMessageDataResponseWalletCleanUp
		>
	>) => {
		const { msg } = data;

		switch (msg) {
			case 'syncIcpWallet':
				syncWallet({
					tokenId: ICP_TOKEN_ID,
					data: data.data as PostMessageDataResponseWallet<
						Omit<GetAccountIdentifierTransactionsResponse, 'transactions'>
					>
				});
				return;
			case 'syncIcpWalletError':
				onLoadTransactionsError({
					tokenId: ICP_TOKEN_ID,
					error: (data.data as PostMessageDataResponseError).error
				});
				return;
			case 'syncIcpWalletCleanUp':
				onTransactionsCleanUp({
					tokenId: ICP_TOKEN_ID,
					transactionIds: (data.data as PostMessageDataResponseWalletCleanUp).transactionIds
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
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerIcpWalletTimer'
			});
		}
	};
};
