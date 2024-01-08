import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import type {
	GetAccountIdentifierTransactionsResponse,
	Transaction,
	TransactionWithId
} from '@dfinity/ledger-icp';
import { getTransactions as getTransactionsApi } from '../api/icp-index.api';
import { type TimerWorkerUtilsJobData } from '../worker-utils/timer.worker-utils';
import { WalletWorkerUtils } from '../worker-utils/wallet.worker-utils';

const getTransactions = ({
	identity
}: TimerWorkerUtilsJobData<PostMessageDataRequest>): Promise<GetAccountIdentifierTransactionsResponse> => {
	return getTransactionsApi({
		identity,
		owner: identity.getPrincipal(),
		// We query tip to discover the new transactions
		start: undefined
	});
};

const worker: WalletWorkerUtils<Transaction, TransactionWithId, PostMessageDataRequest> =
	new WalletWorkerUtils(getTransactions, 'syncIcpWallet');

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopIcpWalletTimer':
			worker.stop();
			return;
		case 'startIcpWalletTimer':
			await worker.start(data);
			return;
	}
};
