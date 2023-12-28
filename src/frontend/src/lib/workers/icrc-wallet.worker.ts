import { getTransactions } from '$lib/api/icrc-index.api';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type {
	PostMessage,
	PostMessageDataRequestIcrc,
	PostMessageDataResponseIcrcWallet
} from '$lib/types/post-message';
import {
	TimerWorkerUtils,
	type TimerWorkerUtilsJobData
} from '$lib/worker-utils/timer.worker-utils';
import type { IcrcTransaction, IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import type { GetTransactions } from '@dfinity/ledger-icrc/dist/candid/icrc_index';
import { assertNonNullish, jsonReplacer } from '@dfinity/utils';

const worker = new TimerWorkerUtils();

onmessage = async ({ data: dataMsg }: MessageEvent<PostMessage<PostMessageDataRequestIcrc>>) => {
	const { msg, data } = dataMsg;

	switch (msg) {
		case 'stopIcrcWalletTimer':
			worker.stop();
			return;
		case 'startIcrcWalletTimer':
			await worker.start<PostMessageDataRequestIcrc>({
				interval: WALLET_TIMER_INTERVAL_MILLIS,
				job: syncWallet,
				data
			});
			return;
	}
};

let transactions: Record<string, IcrcTransaction> = {};
let initialized = false;

const syncWallet = async ({
	identity,
	data
}: TimerWorkerUtilsJobData<PostMessageDataRequestIcrc>) => {
	assertNonNullish(data, 'No data - indexCanisterId - provided to fetch transactions.');

	const { transactions: fetchedTransactions, ...rest } = await getTransactions({
		identity,
		owner: identity.getPrincipal(),
		// We query tip to discover the new transactions
		start: undefined,
		...data
	});

	const newTransactions = fetchedTransactions.filter(
		({ id }) => !Object.keys(transactions).includes(`${id}`)
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
			(acc: Record<string, IcrcTransaction>, { id, transaction }: IcrcTransactionWithId) => ({
				...acc,
				[`${id}`]: transaction
			}),
			{}
		)
	};

	postMessageWallet({ transactions: newTransactions, ...rest });
};

const postMessageWallet = ({ transactions: newTransactions, ...rest }: GetTransactions) =>
	worker.postMsg<PostMessageDataResponseIcrcWallet>({
		msg: 'syncIcrcWallet',
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
