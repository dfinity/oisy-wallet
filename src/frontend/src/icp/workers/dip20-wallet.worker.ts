import type { Event } from '$declarations/xtc_ledger/xtc_ledger.did';
import { balance, transactions } from '$icp/api/xtc-ledger.api';
import { IcWalletBalanceAndTransactionsScheduler } from '$icp/schedulers/ic-wallet-balance-and-transactions.scheduler';
import type { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import type { Dip20TransactionWithId } from '$icp/types/api';
import type { IcTransactionAddOnsInfo, IcTransactionUi } from '$icp/types/ic-transaction';
import {
	mapDip20Transaction,
	mapTransactionDip20ToSelf
} from '$icp/utils/dip20-transactions.utils';
import type { SchedulerJobData, SchedulerJobParams } from '$lib/schedulers/scheduler';
import type { PostMessage, PostMessageDataRequest } from '$lib/types/post-message';
import { isNullish } from '@dfinity/utils';

// TODO: add query for transactions - for now we mock with empty transactions
type GetTransactions = {
	transactions: Dip20TransactionWithId[];
	oldest_tx_id: [] | [bigint];
};

type GetBalance = bigint;

type GetBalanceAndTransactions = GetTransactions & { balance: GetBalance };

const getBalance = ({
	identity
}: SchedulerJobParams<PostMessageDataRequest>): Promise<GetBalance> =>
	balance({
		identity,
		owner: identity.getPrincipal()
	});

const getTransactions = ({
	identity,
	certified
}: SchedulerJobParams<PostMessageDataRequest>): Promise<GetTransactions> =>
	transactions({ identity, certified });

const getBalanceAndTransactions = async (
	params: SchedulerJobParams<PostMessageDataRequest>
): Promise<GetBalanceAndTransactions> => {
	console.log(111111111111111111111111111);
	const foo = await getBalance(params);
	console.log(22222222222222222222222222, foo);

	const bar = await getTransactions(params);
	console.log(33333333333333333333333333, bar);

	const [balance, transactions] = await Promise.all([
		getBalance(params),
		// TODO: add query for transactions - for now we mock with empty transactions
		getTransactions(params)
	]);

	console.log(44444444444444444444444444, balance, transactions, {
		balance,
		// TODO: add query for transactions - for now we mock with empty transactions
		...transactions
	});

	return {
		balance,
		// TODO: add query for transactions - for now we mock with empty transactions
		...transactions
	};
};

const mapTransaction = ({
	transaction,
	jobData: { identity }
}: {
	transaction: Pick<Dip20TransactionWithId, 'id'> & {
		transaction: Event & IcTransactionAddOnsInfo;
	};
	jobData: SchedulerJobData<PostMessageDataRequest>;
}): IcTransactionUi => mapDip20Transaction({ transaction, identity });

const initDip20WalletBalanceAndTransactionsScheduler = (): IcWalletBalanceAndTransactionsScheduler<
	Event,
	Dip20TransactionWithId,
	PostMessageDataRequest
> =>
	new IcWalletBalanceAndTransactionsScheduler(
		getBalanceAndTransactions,
		mapTransactionDip20ToSelf,
		mapTransaction,
		'syncDip20Wallet'
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
		case 'startDip20WalletTimer':
		case 'stopDip20WalletTimer':
			scheduler?.stop();
	}

	switch (msg) {
		case 'startDip20WalletTimer': {
			scheduler = initDip20WalletScheduler(data);
			await scheduler.start(data);
			break;
		}
		case 'triggerDip20WalletTimer': {
			if (isNullish(scheduler)) {
				scheduler = initDip20WalletScheduler(data);
			}
			await scheduler.trigger(data);
		}
	}
};
