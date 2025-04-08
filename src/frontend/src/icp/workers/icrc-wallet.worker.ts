import { getTransactions as getTransactionsApi } from '$icp/api/icrc-index-ng.api';
import { balance } from '$icp/api/icrc-ledger.api';
import { IcWalletBalanceScheduler } from '$icp/schedulers/ic-wallet-balance.scheduler';
import { IcWalletTransactionsScheduler } from '$icp/schedulers/ic-wallet-transactions.scheduler';
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
import {
	type IcrcIndexNgGetTransactions,
	type IcrcTransaction,
	type IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';

const getTransactions = ({
	identity,
	certified,
	data
}: SchedulerJobParams<PostMessageDataRequestIcrcStrict>): Promise<IcrcIndexNgGetTransactions> => {
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
}: SchedulerJobParams<PostMessageDataRequestIcrc>): Promise<bigint> => {
	assertNonNullish(data, 'No data - ledgerIndexCanister - provided to fetch balance.');

	return balance({
		identity,
		certified,
		owner: identity.getPrincipal(),
		...data
	});
};

const getTransactionsWithLedgerBalance = async (
	params: SchedulerJobParams<PostMessageDataRequestIcrcStrict>
): Promise<IcrcIndexNgGetTransactions> => {
	const balance = await getBalance(params);

	// Ignoring the balance from the transactions' response.
	// Even if it could cause some sort of lagged inconsistency, we prefer to always show the latest balance, in case the Index canister is not properly working.
	const transactions = await getTransactions(params);

	return { ...transactions, balance };
};

const MSG_SYNC_ICRC_WALLET = 'syncIcrcWallet';

const initIcrcWalletTransactionsScheduler = (): IcWalletTransactionsScheduler<
	IcrcTransaction,
	IcrcTransactionWithId,
	PostMessageDataRequestIcrcStrict
> =>
	new IcWalletTransactionsScheduler(
		getTransactionsWithLedgerBalance,
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
		? initIcrcWalletTransactionsScheduler()
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
