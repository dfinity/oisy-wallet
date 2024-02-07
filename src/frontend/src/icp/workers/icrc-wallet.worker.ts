import { getTransactions as getTransactionsApi } from '$icp/api/icrc-index.api';
import type { IcTransactionUi } from '$icp/types/ic';
import { mapCkBTCTransaction } from '$icp/utils/ckbtc-transactions.utils';
import { isTokenCkBtcLedger } from '$icp/utils/ic-send.utils';
import { mapIcrcTransaction, mapTransactionIcrcToSelf } from '$icp/utils/icrc-transactions.utils';
import {
	type TimerWorkerUtilsJobData,
	type TimerWorkerUtilsJobParams
} from '$icp/worker-utils/timer.worker-utils';
import { WalletWorkerUtils } from '$icp/worker-utils/wallet.worker-utils';
import type { PostMessage, PostMessageDataRequestIcrc } from '$lib/types/post-message';
import {
	type IcrcGetTransactions,
	type IcrcTransaction,
	type IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { assertNonNullish, nonNullish } from '@dfinity/utils';

const getTransactions = ({
	identity,
	certified,
	data
}: TimerWorkerUtilsJobParams<PostMessageDataRequestIcrc>): Promise<IcrcGetTransactions> => {
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
	jobData: TimerWorkerUtilsJobData<PostMessageDataRequestIcrc>;
}): IcTransactionUi => {
	if (nonNullish(data) && isTokenCkBtcLedger({ ledgerCanisterId: data.ledgerCanisterId })) {
		return mapCkBTCTransaction({ transaction, identity });
	}

	return mapIcrcTransaction({ transaction, identity });
};

const worker: WalletWorkerUtils<
	IcrcTransaction,
	IcrcTransactionWithId,
	PostMessageDataRequestIcrc
> = new WalletWorkerUtils(
	getTransactions,
	mapTransactionIcrcToSelf,
	mapTransaction,
	'syncIcrcWallet'
);

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcrc>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopIcrcWalletTimer':
			worker.stop();
			return;
		case 'startIcrcWalletTimer':
			await worker.start(data);
			return;
		case 'triggerIcrcWalletTimer':
			await worker.trigger(data);
			return;
	}
};
