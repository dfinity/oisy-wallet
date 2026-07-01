import { getTransactions } from '$icp/api/icp-index.api';
import { accountBalance } from '$icp/api/icp-ledger.api';
import {
	IcWalletBalanceAndTransactionsScheduler,
	type GetBalanceAndTransactions
} from '$icp/schedulers/ic-wallet-balance-and-transactions.scheduler';
import type { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import type { IcTransactionAddOnsInfo, IcTransactionUi } from '$icp/types/ic-transaction';
import { mapIcpTransaction, mapTransactionIcpToSelf } from '$icp/utils/icp-transactions.utils';
import type { SchedulerJobData, SchedulerJobParams } from '$lib/schedulers/scheduler';
import type { PostMessage, PostMessageDataRequestIcp } from '$lib/types/post-message';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

const getBalance = ({
	identity,
	certified,
	data
}: SchedulerJobParams<PostMessageDataRequestIcp>): Promise<bigint> => {
	assertNonNullish(data, 'No data - ledgerCanisterId - provided to fetch balance.');

	return accountBalance({
		identity,
		certified,
		owner: identity.getPrincipal(),
		ledgerCanisterId: data.ledgerCanisterId
	});
};

const getTransactionsFromIndex = ({
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
		indexCanisterId: data.indexCanisterId
	});
};

const getBalanceAndTransactions = async (
	params: SchedulerJobParams<PostMessageDataRequestIcp>
): Promise<GetBalanceAndTransactions<IcpIndexDid.TransactionWithId>> => {
	const [balance, transactions] = await Promise.all([
		getBalance(params),
		getTransactionsFromIndex(params)
	]);

	// Use the Ledger balance as the source of truth and ignore the balance from the Index canister.
	// When the Index canister is low on cycles it stops syncing new blocks without erroring, returning a
	// stale (or zero) balance. Relying on the Ledger canister ensures the displayed balance stays correct
	// even if the Index canister — used only for the transactions history — is lagging or frozen.
	const { balance: _indexCanisterBalance, ...rest } = transactions;

	return { ...rest, balance };
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
