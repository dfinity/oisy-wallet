import { getTransactions as getTransactionsApi } from '$icp/api/icp-index.api';
import type { IcTransactionAddOnsInfo, IcTransactionUi } from '$icp/types/ic';
import { mapIcpTransaction, mapTransactionIcpToSelf } from '$icp/utils/icp-transactions.utils';
import {
	type TimerWorkerUtilsJobData,
	type TimerWorkerUtilsJobParams
} from '$icp/worker-utils/timer.worker-utils';
import { WalletWorkerUtils } from '$icp/worker-utils/wallet.worker-utils';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import type {
	GetAccountIdentifierTransactionsResponse,
	Transaction,
	TransactionWithId
} from '@dfinity/ledger-icp';

const getTransactions = ({
	identity,
	certified
}: TimerWorkerUtilsJobParams<PostMessageDataRequest>): Promise<GetAccountIdentifierTransactionsResponse> => {
	return getTransactionsApi({
		identity,
		certified,
		owner: identity.getPrincipal(),
		// We query tip to discover the new transactions
		start: undefined
	});
};

const mapTransaction = ({
	transaction,
	jobData: { identity }
}: {
	transaction: Pick<TransactionWithId, 'id'> & {
		transaction: Transaction & IcTransactionAddOnsInfo;
	};
	jobData: TimerWorkerUtilsJobData<PostMessageDataRequest>;
}): IcTransactionUi => mapIcpTransaction({ transaction, identity });

const worker: WalletWorkerUtils<Transaction, TransactionWithId, PostMessageDataRequest> =
	new WalletWorkerUtils(getTransactions, mapTransactionIcpToSelf, mapTransaction, 'syncIcpWallet');

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopIcpWalletTimer':
			worker.stop();
			return;
		case 'startIcpWalletTimer':
			await worker.start(data);
			return;
		case 'triggerIcpWalletTimer':
			await worker.trigger(data);
			return;
	}
};
