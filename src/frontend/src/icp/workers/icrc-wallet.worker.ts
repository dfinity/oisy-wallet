import { getTransactions as getTransactionsApi } from '$icp/api/icrc-index-ng.api';
import { balance } from '$icp/api/icrc-ledger.api';
import { IcWalletBalanceAndTransactionsScheduler } from '$icp/schedulers/ic-wallet-balance-and-transactions.scheduler';
import { IcWalletBalanceScheduler } from '$icp/schedulers/ic-wallet-balance.scheduler';
import type { IcWalletScheduler } from '$icp/schedulers/ic-wallet.scheduler';
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
import { emit } from '$lib/utils/events.utils';
import type {
	IcrcIndexNgGetTransactions,
	IcrcTransaction,
	IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';

type GetTransactions = IcrcIndexNgGetTransactions;

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
	transaction: Pick<IcrcTransactionWithId, 'id'> & { transaction: IcrcTransaction };
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
 * The errors raised by this function are handled directly in the scheduler.
 * If loading the transactions fails, the scheduler restarts using only the Ledger canister.
 * If loading the balance fails, the same happens, and we don't load the transactions any more.
 * It was deemed not relevant since the balance is more important than the transactions, and the new balance-only scheduler will handle any errors from that point.
 *
 * @param {SchedulerJobParams<PostMessageDataRequestIcrcStrict>} params - The parameters for the function, including the identity and data.
 * @returns {Promise<GetBalanceAndTransactions>} A promise that resolves to an object containing the balance and transactions of the account.
 */
const getBalanceAndTransactions = async (
	params: SchedulerJobParams<PostMessageDataRequestIcrcStrict>
): Promise<GetBalanceAndTransactions> => {
	const [balance, transactions] = await Promise.all([getBalance(params), getTransactions(params)]);

	// Ignoring the balance from the transactions' response.
	// Even if it could cause some sort of lagged inconsistency, we prefer to always show the latest balance, in case the Index canister is not properly working.
	const { balance: indexCanisterBalance, ...rest } = transactions;

	emit({ message: 'oisyIndexCanisterBalanceOutOfSync', detail: balance !== indexCanisterBalance });

	return { ...rest, balance };
};

const MSG_SYNC_ICRC_WALLET = 'syncIcrcWallet';

const initIcrcWalletBalanceAndTransactionsScheduler = (): IcWalletBalanceAndTransactionsScheduler<
	IcrcTransaction,
	IcrcTransactionWithId,
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

let scheduler: IcWalletScheduler<PostMessageDataRequestIcrc> | undefined;

export const onIcrcWalletMessage = async ({
	data: dataMsg
}: MessageEvent<PostMessage<PostMessageDataRequestIcrc>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'startIcrcWalletTimer':
		case 'stopIcrcWalletTimer':
			scheduler?.stop();
	}

	switch (msg) {
		case 'startIcrcWalletTimer': {
			scheduler = initIcrcWalletScheduler(data);
			await scheduler.start(data);
			break;
		}
		case 'triggerIcrcWalletTimer': {
			if (isNullish(scheduler)) {
				scheduler = initIcrcWalletScheduler(data);
			}
			await scheduler.trigger(data);
		}
	}
};
