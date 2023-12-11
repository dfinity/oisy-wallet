import { getTransactions } from '$lib/api/icp-index.api';
import { SYNC_ICP_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/icp.constants';
import type {
	PostMessage,
	PostMessageDataRequest,
	PostMessageDataResponseICPWallet
} from '$lib/types/post-message';
import {
	TimerWorkerUtils,
	type TimerWorkerUtilsJobData
} from '$lib/worker-utils/timer.worker-utils';
import type {
	GetAccountIdentifierTransactionsResponse,
	Transaction,
	TransactionWithId
} from '@dfinity/ledger-icp';
import { jsonReplacer } from '@dfinity/utils';

const worker = new TimerWorkerUtils();

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequest>>) => {
	const { msg, data } = dataMsg;

	console.log('AAAA')

	switch (msg) {
		case 'stopICPWalletTimer':
			worker.stop();
			return;
		case 'startICPWalletTimer':
			await worker.start<PostMessageDataRequest>({
				interval: SYNC_ICP_WALLET_TIMER_INTERVAL_MILLIS,
				job: syncWallet,
				data
			});
			return;
	}
};

let transactions: Record<string, Transaction> = {};
let initialized = false;

const syncWallet = async ({ identity }: TimerWorkerUtilsJobData<PostMessageDataRequest>) => {

	console.log('BBBB')

	const { transactions: fetchedTransactions, ...rest } = await getTransactions({
		identity,
		owner: identity.getPrincipal(),
		// We query tip to discover the new transactions
		start: undefined
	});

	const newTransactions = fetchedTransactions.filter(
		({ id }: TransactionWithId) => !Object.keys(transactions).includes(`${id}`)
	);

	if (newTransactions.length === 0) {
		// We execute postMessage at least once because developer may have no transaction at all so, we want to display the balance zero
		if (!initialized) {
			postMessageWallet({ transactions: newTransactions, ...rest });

			initialized = true;
		}

		return;
	}

	transactions = {
		...transactions,
		...newTransactions.reduce(
			(acc: Record<string, Transaction>, { id, transaction }: TransactionWithId) => ({
				...acc,
				[`${id}`]: transaction
			}),
			{}
		)
	};

	postMessageWallet({ transactions: newTransactions, ...rest });
};

const postMessageWallet = ({
	transactions: newTransactions,
	...rest
}: GetAccountIdentifierTransactionsResponse) =>
	worker.postMsg<PostMessageDataResponseICPWallet>({
		msg: 'syncICPWallet',
		data: {
			wallet: {
				...rest,
				newTransactions: JSON.stringify(
					Object.entries(newTransactions).map(([_id, transaction]) => transaction),
					jsonReplacer
				)
			}
		}
	});
