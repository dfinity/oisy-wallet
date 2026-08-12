import { getTransactions as getTransactionsApi } from '$icp/api/icrc-index-ng.api';
import { balance } from '$icp/api/icrc-ledger.api';
import { IcWalletBalanceAndTransactionsScheduler } from '$icp/schedulers/ic-wallet-balance-and-transactions.scheduler';
import { IcWalletBalanceScheduler } from '$icp/schedulers/ic-wallet-balance.scheduler';
import type { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
import { isIndexCanisterAwake } from '$icp/services/index-canister.services';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { mapCkBTCTransaction } from '$icp/utils/ckbtc-transactions.utils';
import { mapCkEthereumTransaction } from '$icp/utils/cketh-transactions.utils';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import { mapIcrcTransaction, mapTransactionIcrcToSelf } from '$icp/utils/icrc-transactions.utils';
import type { SchedulerJobData, SchedulerJobParams } from '$lib/schedulers/scheduler';
import { PostMessageDataRequestIcrcStrictSchema } from '$lib/schema/post-message.schema';
import type {
	PostMessage,
	PostMessageDataRequestIcrc,
	PostMessageDataRequestIcrcStrict
} from '$lib/types/post-message';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import type { IcrcIndexDid } from '@icp-sdk/canisters/ledger/icrc';

type GetTransactions = IcrcIndexDid.GetTransactions;

type GetBalance = bigint;

type GetBalanceAndTransactions = Omit<GetTransactions, 'balance'> & { balance: GetBalance };

const getTransactions = ({
	identity,
	certified,
	data
}: SchedulerJobParams<PostMessageDataRequestIcrcStrict>): Promise<GetTransactions> => {
	assertNonNullish(data, 'No data - indexCanisterId - provided to fetch transactions.');

	return getTransactionsApi({
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
	jobData: { identity, data }
}: {
	transaction: Pick<IcrcIndexDid.TransactionWithId, 'id'> & {
		transaction: IcrcIndexDid.Transaction;
	};
	jobData: SchedulerJobData<PostMessageDataRequestIcrc>;
}): IcTransactionUi => {
	const ledgerId = nonNullish(data) ? { ledgerCanisterId: data.ledgerCanisterId } : undefined;
	const env = { env: data?.env };

	if (nonNullish(ledgerId) && isTokenCkBtcLedger(ledgerId)) {
		return mapCkBTCTransaction({ transaction, identity, ...env, ...ledgerId });
	}

	if (nonNullish(ledgerId) && (isTokenCkEthLedger(ledgerId) || isTokenCkErc20Ledger(ledgerId))) {
		return mapCkEthereumTransaction({ transaction, identity, ...env, ...ledgerId });
	}

	return mapIcrcTransaction({ transaction, identity });
};

const getBalance = ({
	identity,
	certified,
	data
}: SchedulerJobParams<PostMessageDataRequestIcrc>): Promise<GetBalance> => {
	assertNonNullish(data, 'No data - ledgerIndexCanister - provided to fetch balance.');

	return balance({
		identity,
		certified,
		owner: identity.getPrincipal(),
		...data
	});
};

/**
 * Fetches the balance from the Ledger canister and the transactions from the Index canister.
 *
 * The transactions are fetched using the `getTransactions` function, which is a wrapper around the `getTransactions` function of the ICRC Index canister API.
 * The balance is fetched using the `getBalance` function, which is a wrapper around the `balance` function of the ICRC Ledger canister API.
 *
 * @param {SchedulerJobParams<PostMessageDataRequestIcrcStrict>} params - The parameters for the function, including the identity and data.
 * @returns {Promise<GetBalanceAndTransactions>} A promise that resolves to an object containing the balance and transactions of the account.
 */
const getBalanceAndTransactions = async (
	params: SchedulerJobParams<PostMessageDataRequestIcrcStrict>
): Promise<GetBalanceAndTransactions> => {
	const [balanceResult, transactionsResult] = await Promise.allSettled([
		getBalance(params),
		getTransactions(params)
	]);

	// The Ledger balance is the source of truth. Without it there is nothing meaningful to display, so
	// a Ledger failure is fatal and surfaced as a sync error.
	if (balanceResult.status === 'rejected') {
		throw balanceResult.reason;
	}

	const { value: balance } = balanceResult;

	// A failing Index canister must not block the Ledger balance update, nor discard the transactions
	// already displayed. The Index only feeds the transactions history, so on failure we post the
	// balance with no transaction delta and let the history catch up on the next successful tick.
	const withoutNewTransactions: GetBalanceAndTransactions = {
		balance,
		transactions: [],
		oldest_tx_id: []
	};

	if (transactionsResult.status === 'rejected') {
		return withoutNewTransactions;
	}

	// Ignoring the balance from the transactions' response.
	// Even if it could cause some sort of lagged inconsistency, we prefer to always show the latest balance, in case the Index canister is not properly working.
	const { balance: indexCanisterBalance, ...rest } = transactionsResult.value;

	const indexCanisterIsOutOfSync = balance !== indexCanisterBalance;

	if (indexCanisterIsOutOfSync && nonNullish(params.data)) {
		const {
			identity,
			certified,
			data: { ledgerCanisterId, indexCanisterId }
		} = params;

		// A status check that fails is as inconclusive as a negative verdict: either way we cannot
		// trust the transactions we just received.
		const indexCanisterAwake = await isIndexCanisterAwake({
			identity,
			certified,
			ledgerCanisterId,
			indexCanisterId
		}).catch(() => false);

		if (!indexCanisterAwake) {
			return withoutNewTransactions;
		}
	}

	return { ...rest, balance };
};

const MSG_SYNC_ICRC_WALLET = 'syncIcrcWallet';

const initIcrcWalletBalanceAndTransactionsScheduler = (): IcWalletBalanceAndTransactionsScheduler<
	IcrcIndexDid.Transaction,
	IcrcIndexDid.TransactionWithId,
	PostMessageDataRequestIcrcStrict
> =>
	new IcWalletBalanceAndTransactionsScheduler(
		getBalanceAndTransactions,
		mapTransactionIcrcToSelf,
		mapTransaction,
		MSG_SYNC_ICRC_WALLET
	);

const initIcrcWalletBalanceScheduler = (): IcWalletBalanceScheduler<PostMessageDataRequestIcrc> =>
	new IcWalletBalanceScheduler(getBalance, MSG_SYNC_ICRC_WALLET);

// Exposed for test purposes
export const initIcrcWalletScheduler = (
	data: PostMessageDataRequestIcrc | undefined
): IcWalletScheduler<PostMessageDataRequestIcrc> => {
	const { success: withIndexCanister } = PostMessageDataRequestIcrcStrictSchema.safeParse(data);

	return withIndexCanister
		? initIcrcWalletBalanceAndTransactionsScheduler()
		: initIcrcWalletBalanceScheduler();
};

const schedulers = new Map<string, IcWalletScheduler<PostMessageDataRequestIcrc>>();

const stopAllSchedulers = () => {
	schedulers.forEach((scheduler) => scheduler.stop());
	schedulers.clear();
};

export const onIcrcWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestIcrc>>) => {
	const { msg, data } = dataMsg;

	const schedulerKey =
		nonNullish(data) && 'ledgerCanisterId' in data ? data.ledgerCanisterId : undefined;

	switch (msg) {
		case 'startIcrcWalletTimer': {
			if (isNullish(schedulerKey)) {
				return;
			}

			schedulers.get(schedulerKey)?.stop();

			const scheduler = initIcrcWalletScheduler(data);

			schedulers.set(schedulerKey, scheduler);

			await scheduler.start(data);

			break;
		}
		case 'stopIcrcWalletTimer': {
			if (isNullish(schedulerKey)) {
				stopAllSchedulers();
				break;
			}

			schedulers.get(schedulerKey)?.stop();

			schedulers.delete(schedulerKey);

			break;
		}
		case 'triggerIcrcWalletTimer': {
			if (isNullish(schedulerKey)) {
				return;
			}

			let scheduler = schedulers.get(schedulerKey);

			if (isNullish(scheduler)) {
				scheduler = initIcrcWalletScheduler(data);

				schedulers.set(schedulerKey, scheduler);
			}

			await scheduler.trigger(data);
		}
	}
};
