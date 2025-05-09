import type { Event } from '$declarations/xtc_ledger/xtc_ledger.did';
import { balance as getBalance } from '$icp/api/xtc-ledger.api';
import {
	IcWalletBalanceAndTransactionsScheduler,
	type GetBalanceAndTransactions
} from '$icp/schedulers/ic-wallet-balance-and-transactions.scheduler';
import type { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import type { TransactionWithId } from '$icp/types/api';
import type { IcTransactionAddOnsInfo, IcTransactionUi } from '$icp/types/ic-transaction';
import {
	mapDip20Transaction,
	mapTransactionDip20ToSelf
} from '$icp/utils/dip20-transactions.utils';
import type { SchedulerJobData, SchedulerJobParams } from '$lib/schedulers/scheduler';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { isNullish } from '@dfinity/utils';

const getBalanceAndTransactions = async ({
	identity
}: SchedulerJobParams<PostMessageDataRequest>): Promise<
	GetBalanceAndTransactions<TransactionWithId>
> => {
	const balance = await getBalance({
		identity,
		owner: identity.getPrincipal()
	});

	return {
		balance,
		// TODO: add query for transactions
		transactions: [],
		oldest_tx_id: []
	};
};

const mapTransaction = ({
	transaction,
	jobData: { identity }
}: {
	transaction: Pick<TransactionWithId, 'id'> & {
		transaction: Event & IcTransactionAddOnsInfo;
	};
	jobData: SchedulerJobData<PostMessageDataRequest>;
}): IcTransactionUi => mapDip20Transaction({ transaction, identity });

const initDip20WalletBalanceAndTransactionsScheduler = (): IcWalletBalanceAndTransactionsScheduler<
	Event,
	TransactionWithId,
	PostMessageDataRequest
> =>
	new IcWalletBalanceAndTransactionsScheduler(
		getBalanceAndTransactions,
		mapTransactionDip20ToSelf,
		mapTransaction,
		'syncIcpWallet'
	);

// Exposed for test purposes
export const initDip20WalletScheduler = (
	_data: PostMessageDataRequest | undefined
): IcWalletScheduler<PostMessageDataRequest> => initDip20WalletBalanceAndTransactionsScheduler();

let scheduler: IcWalletScheduler<PostMessageDataRequest> | undefined;

export const onDip20WalletMessage = async ({
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
			scheduler = initDip20WalletScheduler(data);
			await scheduler.start(data);
			break;
		}
		case 'triggerIcpWalletTimer': {
			if (isNullish(scheduler)) {
				scheduler = initDip20WalletScheduler(data);
			}
			await scheduler.trigger(data);
		}
	}
};
