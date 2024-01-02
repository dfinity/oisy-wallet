import { getTransactions as getTransactionsApi } from '$lib/api/icp-index.api';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { type TimerWorkerUtilsJobData } from '$lib/worker-utils/timer.worker-utils';
import { WalletWorkerUtils } from '$lib/worker-utils/wallet.worker-utils';
import type {
	GetAccountIdentifierTransactionsResponse,
	Transaction,
	TransactionWithId
} from '@dfinity/ledger-icp';

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
