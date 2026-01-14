import { getTransactions } from '$icp/api/icp-index.api';
import { IcWalletBalanceAndTransactionsScheduler } from '$icp/schedulers/ic-wallet-balance-and-transactions.scheduler';
import type { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import type { IcTransactionAddOnsInfo, IcTransactionUi } from '$icp/types/ic-transaction';
import { mapIcpTransaction, mapTransactionIcpToSelf } from '$icp/utils/icp-transactions.utils';
import type { SchedulerJobData, SchedulerJobParams } from '$lib/schedulers/scheduler';
import type { PostMessage, PostMessageDataRequestIcp } from '$lib/types/post-message';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

const getBalanceAndTransactions = ({
	identity,
	certified,
	data
}: SchedulerJobParams<PostMessageDataRequestIcp>): Promise<IcpIndexDid.GetAccountIdentifierTransactionsResponse> => {
	assertNonNullish(data, 'No data - indexCanisterId - provided to fetch transactions.');

	return getTransactions({
		identity,
		certified,
		owner: identity.getPrincipal(),
		// We query tip to discover the new transactions
		start: undefined,
		...data
	});
};

const mapTransaction = ({
	transaction,
	jobData: { identity }
}: {
	transaction: Pick<IcpIndexDid.TransactionWithId, 'id'> & {
		transaction: IcpIndexDid.Transaction & IcTransactionAddOnsInfo;
	};
	jobData: SchedulerJobData<PostMessageDataRequestIcp>;
}): IcTransactionUi => mapIcpTransaction({ transaction, identity });

const initIcpWalletBalanceAndTransactionsScheduler = (): IcWalletBalanceAndTransactionsScheduler<
	IcpIndexDid.Transaction,
	IcpIndexDid.TransactionWithId,
	PostMessageDataRequestIcp
> =>
	new IcWalletBalanceAndTransactionsScheduler(
		getBalanceAndTransactions,
		mapTransactionIcpToSelf,
		mapTransaction,
		'syncIcpWallet'
	);

// Exposed for test purposes
export const initIcpWalletScheduler = (
	_data: PostMessageDataRequestIcp | undefined
): IcWalletScheduler<PostMessageDataRequestIcp> => initIcpWalletBalanceAndTransactionsScheduler();

let scheduler: IcWalletScheduler<PostMessageDataRequestIcp> | undefined;

export const onIcpWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestIcp>>) => {
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
