import { getTransactions as getTransactionsApi } from '$icp/api/icp-index.api';
import { IcWalletTransactionsScheduler } from '$icp/schedulers/ic-wallet-transactions.scheduler';
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

const initIcpWalletTransactionsScheduler = (): IcWalletTransactionsScheduler<
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

// Exposed for test purposes
export const initIcpWalletScheduler = (
	_data: PostMessageDataRequest | undefined
): IcWalletScheduler<PostMessageDataRequest> => initIcpWalletTransactionsScheduler();

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
