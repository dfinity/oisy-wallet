import { getTransactions as getTransactionsApi } from '$icp/api/icp-index.api';
import { IcWalletTransactionsScheduler } from '$icp/schedulers/ic-wallet-transactions.scheduler';
import type { IcTransactionAddOnsInfo, IcTransactionUi } from '$icp/types/ic-transaction';
import { mapIcpTransaction, mapTransactionIcpToSelf } from '$icp/utils/icp-transactions.utils';
import type { SchedulerJobData, SchedulerJobParams } from '$lib/schedulers/scheduler';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import type {
	GetAccountIdentifierTransactionsResponse,
	Transaction,
	TransactionWithId
} from '@dfinity/ledger-icp';

const getTransactions = ({
	identity,
	certified
}: SchedulerJobParams<PostMessageDataRequest>): Promise<GetAccountIdentifierTransactionsResponse> =>
	getTransactionsApi({
		identity,
		certified,
		owner: identity.getPrincipal(),
		// We query tip to discover the new transactions
		start: undefined
	});

const mapTransaction = ({
	transaction,
	jobData: { identity }
}: {
	transaction: Pick<TransactionWithId, 'id'> & {
		transaction: Transaction & IcTransactionAddOnsInfo;
	};
	jobData: SchedulerJobData<PostMessageDataRequest>;
}): IcTransactionUi => mapIcpTransaction({ transaction, identity });

// Exposed for test purposes
export const initIcpWalletTransactionsScheduler = (): IcWalletTransactionsScheduler<
	Transaction,
	TransactionWithId,
	PostMessageDataRequest
> =>
	new IcWalletTransactionsScheduler(
		getTransactions,
		mapTransactionIcpToSelf,
		mapTransaction,
		'syncIcpWallet'
	);

const scheduler = initIcpWalletTransactionsScheduler();

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopIcpWalletTimer':
			scheduler.stop();
			return;
		case 'startIcpWalletTimer':
			await scheduler.start(data);
			return;
		case 'triggerIcpWalletTimer':
			await scheduler.trigger(data);
			return;
	}
};
