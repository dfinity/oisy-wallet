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
import { KONG_BACKEND_CANISTER_ID, XTC_LEDGER_CANISTER_ID } from '$lib/constants/app.constants';
import type { SchedulerJobData, SchedulerJobParams } from '$lib/schedulers/scheduler';
import type {
	PostMessage,
	PostMessageDataRequest,
	PostMessageDataRequestDip20
} from '$lib/types/post-message';
import { isNullish } from '@dfinity/utils';

// TODO: add query for transactions - for now we mock with empty transactions
type GetTransactions = {
	transactions: Dip20TransactionWithId[];
	oldest_tx_id: [] | [bigint];
};

type GetBalance = bigint;

type GetBalanceAndTransactions = GetTransactions & { balance: GetBalance };

const getBalance = async ({
	identity,
	data
}: SchedulerJobParams<PostMessageDataRequestDip20>): Promise<GetBalance> => {
	console.log('ledger id', XTC_LEDGER_CANISTER_ID, KONG_BACKEND_CANISTER_ID);

	return await balance({
		identity,
		owner: identity.getPrincipal(),
		...data
	});
};

const getTransactions = ({
	identity,
	certified,
	data
}: SchedulerJobParams<PostMessageDataRequestDip20>): Promise<GetTransactions> =>
	transactions({ identity, certified, ...data });

const getBalanceAndTransactions = async (
	params: SchedulerJobParams<PostMessageDataRequestDip20>
): Promise<GetBalanceAndTransactions> => {
	console.log('av1', params);
	const foo = await getBalance(params);
	console.log('av2', foo);

	const bar = await getTransactions(params);
	console.log('av3', bar);

	const [balance, transactions] = await Promise.all([
		getBalance(params),
		// TODO: add query for transactions - for now we mock with empty transactions
		getTransactions(params)
	]);

	console.log('av3', balance, transactions, {
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
	_data: PostMessageDataRequestDip20 | undefined
): IcWalletScheduler<PostMessageDataRequestDip20> =>
	initDip20WalletBalanceAndTransactionsScheduler();

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
