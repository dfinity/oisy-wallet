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
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import type { IcpIndexDid } from '@icp-sdk/canisters/ledger/icp';

const getBalance = ({
	identity,
	certified,
	data
}: SchedulerJobParams<PostMessageDataRequestIcp>): Promise<bigint> => {
	assertNonNullish(
		data,
		'No data provided to fetch the balance: the ledgerCanisterId is required.'
	);

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
	assertNonNullish(
		data,
		'No data provided to fetch the transactions: the indexCanisterId is required.'
	);

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
	const [balanceResult, transactionsResult] = await Promise.allSettled([
		getBalance(params),
		getTransactionsFromIndex(params)
	]);

	// The Ledger balance is the source of truth. Without it there is nothing meaningful to display, so
	// a Ledger failure is fatal and surfaced as a sync error.
	if (balanceResult.status === 'rejected') {
		throw balanceResult.reason;
	}

	const { value: balance } = balanceResult;

	// A failing Index canister must not block the Ledger balance update. The Index only feeds the
	// transactions history, so on failure we post the balance with no transaction delta and let the
	// history catch up on the next successful tick.
	if (transactionsResult.status === 'rejected') {
		return { balance, transactions: [], oldest_tx_id: [] };
	}

	// Ignore the balance reported by the Index canister. When it is low on cycles it stops syncing new
	// blocks without erroring, returning a stale (or zero) balance. Relying on the Ledger canister keeps
	// the displayed balance correct even if the Index canister is lagging or frozen.
	const { balance: _indexCanisterBalance, ...rest } = transactionsResult.value;

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

// ICP and Test ICP are both ICP-standard tokens, and pooled wallet workers can run them in the same
// worker realm, so each Ledger canister gets its own scheduler.
const schedulers = new Map<string, IcWalletScheduler<PostMessageDataRequestIcp>>();

const stopAllSchedulers = () => {
	schedulers.forEach((scheduler) => scheduler.stop());
	schedulers.clear();
};

export const onIcpWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestIcp>>) => {
	const { msg, data } = dataMsg;

	const schedulerKey =
		nonNullish(data) && 'ledgerCanisterId' in data ? data.ledgerCanisterId : undefined;

	switch (msg) {
		case 'startIcpWalletTimer': {
			if (isNullish(schedulerKey)) {
				return;
			}

			schedulers.get(schedulerKey)?.stop();

			const scheduler = initIcpWalletScheduler(data);

			schedulers.set(schedulerKey, scheduler);

			await scheduler.start(data);

			break;
		}
		case 'stopIcpWalletTimer': {
			if (isNullish(schedulerKey)) {
				stopAllSchedulers();
				break;
			}

			schedulers.get(schedulerKey)?.stop();

			schedulers.delete(schedulerKey);

			break;
		}
		case 'triggerIcpWalletTimer': {
			if (isNullish(schedulerKey)) {
				return;
			}

			let scheduler = schedulers.get(schedulerKey);

			if (isNullish(scheduler)) {
				scheduler = initIcpWalletScheduler(data);

				schedulers.set(schedulerKey, scheduler);
			}

			await scheduler.trigger(data);
		}
	}
};
