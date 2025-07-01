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
import { nonNullish } from '@dfinity/utils';

export const initIcrcWalletWorker = async ({
	indexCanisterId,
	ledgerCanisterId,
	id: tokenId,
	network: { env }
}: IcToken): Promise<WalletWorker> => {
	const WalletWorker = await import('$lib/workers/workers?worker');
	const worker: Worker = new WalletWorker.default();

	let restartedWithLedgerOnly = false;

	const restartWorkerWithLedgerOnly = () => {
		if (restartedWithLedgerOnly) {
			return;
		}

		restartedWithLedgerOnly = true;

		worker.postMessage({
			msg: 'startIcrcWalletTimer',
			data: {
				ledgerCanisterId,
				env
			}
		});
	};

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
			case 'syncIcrcWallet':
				syncWallet({
					tokenId,
					data: data as PostMessageDataResponseWallet
				});
				return;
			case 'syncIcrcWalletError':
				onLoadTransactionsError({
					tokenId,
					error: data.error
				});

				// In case of error, we start the listener again, but only with the ledgerCanisterId,
				// to make it request only the balance and not the transactions
				if (nonNullish(indexCanisterId)) {
					restartWorkerWithLedgerOnly();
				}

				return;
			case 'syncIcrcWalletCleanUp':
				onTransactionsCleanUp({
					tokenId,
					transactionIds: (data as PostMessageDataResponseWalletCleanUp).transactionIds
				});
				return;
		}
	};

	return {
		start: () => {
			worker.postMessage({
				msg: 'startIcrcWalletTimer',
				data: {
					indexCanisterId,
					ledgerCanisterId,
					env
				}
			});
		},
		stop: () => {
			worker.postMessage({
				msg: 'stopIcrcWalletTimer'
			});
		},
		trigger: () => {
			worker.postMessage({
				msg: 'triggerIcrcWalletTimer',
				data: {
					indexCanisterId,
					ledgerCanisterId,
					env
				}
			});
		}
	};
};
