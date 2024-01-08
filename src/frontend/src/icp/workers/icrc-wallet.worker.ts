import type { PostMessage, PostMessageDataRequestIcrc } from '$lib/types/post-message';
import type {
	IcrcGetTransactions,
	IcrcTransaction,
	IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { assertNonNullish } from '@dfinity/utils';
import { getTransactions as getTransactionsApi } from '../api/icrc-index.api';
import { type TimerWorkerUtilsJobData } from '../worker-utils/timer.worker-utils';
import { WalletWorkerUtils } from '../worker-utils/wallet.worker-utils';

const getTransactions = ({
	identity,
	data
}: TimerWorkerUtilsJobData<PostMessageDataRequestIcrc>): Promise<IcrcGetTransactions> => {
	assertNonNullish(data, 'No data - indexCanisterId - provided to fetch transactions.');

	return getTransactionsApi({
		identity,
		owner: identity.getPrincipal(),
		// We query tip to discover the new transactions
		start: undefined,
		...data
	});
};

const worker: WalletWorkerUtils<
	IcrcTransaction,
	IcrcTransactionWithId,
	PostMessageDataRequestIcrc
> = new WalletWorkerUtils(getTransactions, 'syncIcrcWallet');

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcrc>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopIcrcWalletTimer':
			worker.stop();
			return;
		case 'startIcrcWalletTimer':
			await worker.start(data);
			return;
	}
};
