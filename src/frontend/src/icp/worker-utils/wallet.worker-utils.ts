import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type {
	GetAccountIdentifierTransactionsResponse,
	Transaction,
	TransactionWithId
} from '@dfinity/ledger-icp';
import type {
	IcrcGetTransactions,
	IcrcTransaction,
	IcrcTransactionWithId
} from '@dfinity/ledger-icrc';
import { jsonReplacer } from '@dfinity/utils';
import { TimerWorkerUtils, type TimerWorkerUtilsJobData } from './timer.worker-utils';

export type GetTransactions =
	| Omit<IcrcGetTransactions, 'transactions'>
	| Omit<GetAccountIdentifierTransactionsResponse, 'transactions'>;

export class WalletWorkerUtils<
	T extends IcrcTransaction | Transaction,
	TWithId extends IcrcTransactionWithId | TransactionWithId,
	PostMessageDataRequest
> {
	private worker = new TimerWorkerUtils();

	private transactions: Record<string, T> = {};
	private initialized = false;

	constructor(
		private getTransactions: (
			data: TimerWorkerUtilsJobData<PostMessageDataRequest>
		) => Promise<GetTransactions & { transactions: TWithId[] }>,
		private msg: 'syncIcpWallet' | 'syncIcrcWallet'
	) {}

	stop() {
		this.worker.stop();
	}

	async start(data: PostMessageDataRequest | undefined) {
		await this.worker.start<PostMessageDataRequest>({
			interval: WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	private syncWallet = async (data: TimerWorkerUtilsJobData<PostMessageDataRequest>) => {
		const { transactions: fetchedTransactions, ...rest } = await this.getTransactions(data);

		const newTransactions = fetchedTransactions.filter(
			({ id }) => !Object.keys(this.transactions).includes(`${id}`)
		);

		if (newTransactions.length === 0) {
			// We execute postMessage at least once because developer may have no transaction at all so, we want to display the balance zero
			if (!this.initialized) {
				this.postMessageWallet({ transactions: newTransactions, ...rest });

				this.initialized = true;
			}

			return;
		}

		this.transactions = {
			...this.transactions,
			...newTransactions.reduce(
				(acc: Record<string, T>, { id, transaction }) => ({
					...acc,
					[`${id}`]: transaction as T
				}),
				{}
			)
		};

		this.postMessageWallet({ transactions: newTransactions, ...rest });
	};

	private postMessageWallet({
		transactions: newTransactions,
		...rest
	}: GetTransactions & { transactions: TWithId[] }) {
		this.worker.postMsg<PostMessageDataResponseWallet<GetTransactions>>({
			msg: this.msg,
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
	}
}
