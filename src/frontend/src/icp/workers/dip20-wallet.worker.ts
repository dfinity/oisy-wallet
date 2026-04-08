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
import type { PostMessage, PostMessageDataRequestDip20 } from '$lib/types/post-message';
import { isNullish, nonNullish } from '@dfinity/utils';

// TODO: add query for transactions - for now we mock with empty transactions
interface GetTransactions {
	transactions: Dip20TransactionWithId[];
	oldest_tx_id: [] | [bigint];
}

type GetBalance = bigint;

type GetBalanceAndTransactions = GetTransactions & { balance: GetBalance };

const getBalance = ({
	identity,
	data
}: SchedulerJobParams<PostMessageDataRequestDip20>): Promise<GetBalance> =>
	balance({
		identity,
		owner: identity.getPrincipal(),
		...data
	});

const getTransactions = ({
	identity,
	certified,
	data
}: SchedulerJobParams<PostMessageDataRequestDip20>): Promise<GetTransactions> =>
	transactions({ identity, certified, ...data });

const getBalanceAndTransactions = async (
	params: SchedulerJobParams<PostMessageDataRequestDip20>
): Promise<GetBalanceAndTransactions> => {
	const [balance, transactions] = await Promise.all([
		getBalance(params),
		// TODO: add query for transactions - for now we mock with empty transactions
		getTransactions(params)
	]);

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
	jobData: SchedulerJobData<PostMessageDataRequestDip20>;
}): IcTransactionUi => mapDip20Transaction({ transaction, identity });

const initDip20WalletBalanceAndTransactionsScheduler = (): IcWalletBalanceAndTransactionsScheduler<
	Event,
	Dip20TransactionWithId,
	PostMessageDataRequestDip20
> =>
	new IcWalletBalanceAndTransactionsScheduler(
		getBalanceAndTransactions,
		mapTransactionDip20ToSelf,
		mapTransaction,
		'syncDip20Wallet'
	);

// Exposed for test purposes
export const initDip20WalletScheduler = (
	_data: PostMessageDataRequestDip20 | undefined
): IcWalletScheduler<PostMessageDataRequestDip20> =>
	initDip20WalletBalanceAndTransactionsScheduler();

const schedulers = new Map<string, IcWalletScheduler<PostMessageDataRequestDip20>>();

const stopAllSchedulers = () => {
	schedulers.forEach((scheduler) => scheduler.stop());
	schedulers.clear();
};

export const onDip20WalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestDip20>>) => {
	const { msg, data } = dataMsg;

	const schedulerKey = nonNullish(data) && 'canisterId' in data ? data.canisterId : undefined;

	switch (msg) {
		case 'startDip20WalletTimer': {
			if (isNullish(schedulerKey)) {
				return;
			}

			schedulers.get(schedulerKey)?.stop();

			const scheduler = initDip20WalletScheduler(data);

			schedulers.set(schedulerKey, scheduler);

			await scheduler.start(data);

			break;
		}
		case 'stopDip20WalletTimer': {
			if (isNullish(schedulerKey)) {
				stopAllSchedulers();

				break;
			}

			schedulers.get(schedulerKey)?.stop();

			schedulers.delete(schedulerKey);

			break;
		}
		case 'triggerDip20WalletTimer': {
			if (isNullish(schedulerKey)) {
				return;
			}

			let scheduler = schedulers.get(schedulerKey);

			if (isNullish(scheduler)) {
				scheduler = initDip20WalletScheduler(data);

				schedulers.set(schedulerKey, scheduler);
			}

			await scheduler.trigger(data);
		}
	}
};
