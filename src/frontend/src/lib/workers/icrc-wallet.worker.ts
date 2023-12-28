import { getTransactions as getTransactionsApi } from '$lib/api/icrc-index.api';
import type { PostMessage, PostMessageDataRequestIcrc } from '$lib/types/post-message';
import { type TimerWorkerUtilsJobData } from '$lib/worker-utils/timer.worker-utils';
import { WalletWorkerUtils } from '$lib/worker-utils/wallet.worker-utils';
import type {
	IcrcGetTransactions,
	IcrcTransaction,
	IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { assertNonNullish } from '@dfinity/utils';

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
