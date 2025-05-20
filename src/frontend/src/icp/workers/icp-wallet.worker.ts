import { getTransactions } from '$icp/api/icp-index.api';
import { IcWalletBalanceAndTransactionsScheduler } from '$icp/schedulers/ic-wallet-balance-and-transactions.scheduler';
import type { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import type { IcTransactionAddOnsInfo, IcTransactionUi } from '$icp/types/ic-transaction';
import { mapIcpTransaction, mapTransactionIcpToSelf } from '$icp/utils/icp-transactions.utils';
import type { SchedulerJobData, SchedulerJobParams } from '$lib/schedulers/scheduler';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import type {
	GetAccountIdentifierTransactionsResponse,
	Transaction,
	TransactionWithId
} from '@dfinity/ledger-icp';
import { isNullish } from '@dfinity/utils';

const getBalanceAndTransactions = ({
	identity,
	certified
}: SchedulerJobParams<PostMessageDataRequest>): Promise<GetAccountIdentifierTransactionsResponse> =>
	getTransactions({
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

const initIcpWalletBalanceAndTransactionsScheduler = (): IcWalletBalanceAndTransactionsScheduler<
	Transaction,
	TransactionWithId,
	PostMessageDataRequest
> =>
	new IcWalletBalanceAndTransactionsScheduler(
		getBalanceAndTransactions,
		mapTransactionIcpToSelf,
		mapTransaction,
		'syncIcpWallet'
	);

// Exposed for test purposes
export const initIcpWalletScheduler = (
	_data: PostMessageDataRequest | undefined
): IcWalletScheduler<PostMessageDataRequest> => initIcpWalletBalanceAndTransactionsScheduler();

let scheduler: IcWalletScheduler<PostMessageDataRequest> | undefined;

export const onIcpWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'startIcpWalletTimer':
		case 'stopIcpWalletTimer':
			scheduler?.stop();
	}

	switch (msg) {
		case 'startIcpWalletTimer': {
			scheduler = initIcpWalletScheduler(data);
			await scheduler.start(data);
			break;
		}
		case 'triggerIcpWalletTimer': {
			if (isNullish(scheduler)) {
				scheduler = initIcpWalletScheduler(data);
			}
			await scheduler.trigger(data);
		}
	}
};
