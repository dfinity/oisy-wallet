import { getTransactions as getTransactionsApi } from '$icp/api/icrc-index-ng.api';
import type { SchedulerJobData, SchedulerJobParams } from '$icp/schedulers/scheduler';
import { WalletScheduler } from '$icp/schedulers/wallet.scheduler';
import type { IcTransactionUi } from '$icp/types/ic';
import { mapCkBTCTransaction } from '$icp/utils/ckbtc-transactions.utils';
import { mapCkETHTransaction } from '$icp/utils/cketh-transactions.utils';
import { isTokenCkBtcLedger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { mapIcrcTransaction, mapTransactionIcrcToSelf } from '$icp/utils/icrc-transactions.utils';
import type { PostMessage, PostMessageDataRequestIcrc } from '$lib/types/post-message';
import {
	type IcrcIndexNgGetTransactions,
	type IcrcTransaction,
	type IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { assertNonNullish, nonNullish } from '@dfinity/utils';

const getTransactions = ({
	identity,
	certified,
	data
}: SchedulerJobParams<PostMessageDataRequestIcrc>): Promise<IcrcIndexNgGetTransactions> => {
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
	if (nonNullish(data) && isTokenCkBtcLedger({ ledgerCanisterId: data.ledgerCanisterId })) {
		return mapCkBTCTransaction({ transaction, identity });
	}

	if (nonNullish(data) && isTokenCkEthLedger({ ledgerCanisterId: data.ledgerCanisterId })) {
		return mapCkETHTransaction({ transaction, identity });
	}

	return mapIcrcTransaction({ transaction, identity });
};

const scheduler: WalletScheduler<
	IcrcTransaction,
	IcrcTransactionWithId,
	PostMessageDataRequestIcrc
> = new WalletScheduler(
	getTransactions,
	mapTransactionIcrcToSelf,
	mapTransaction,
	'syncIcrcWallet'
);

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcrc>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopIcrcWalletTimer':
			scheduler.stop();
			return;
		case 'startIcrcWalletTimer':
			await scheduler.start(data);
			return;
		case 'triggerIcrcWalletTimer':
			await scheduler.trigger(data);
			return;
	}
};
