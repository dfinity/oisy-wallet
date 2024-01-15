import { queryAndUpdate } from '$lib/actors/query.ic';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
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
import { isNullish, jsonReplacer } from '@dfinity/utils';
import {
	TimerWorkerUtils,
	type TimerWorkerUtilsJobData,
	type TimerWorkerUtilsJobParams
} from './timer.worker-utils';

export type GetTransactions =
	| Omit<IcrcGetTransactions, 'transactions'>
	| Omit<GetAccountIdentifierTransactionsResponse, 'transactions'>;

export class WalletWorkerUtils<
	T extends IcrcTransaction | Transaction,
	TWithId extends IcrcTransactionWithId | TransactionWithId,
	PostMessageDataRequest
> {
	private worker = new TimerWorkerUtils();

	private transactions: Record<string, CertifiedData<T>> = {};
	private initialized = false;

	constructor(
		private getTransactions: (
			data: TimerWorkerUtilsJobParams<PostMessageDataRequest>
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

	private syncWallet = async ({
		identity,
		...data
	}: TimerWorkerUtilsJobData<PostMessageDataRequest>) => {
		await queryAndUpdate<GetTransactions & { transactions: TWithId[] }>({
			request: ({ identity: _, certified }) =>
				this.getTransactions({ ...data, identity, certified }),
			onLoad: (results) => this.syncTransactions(results),
			identity
		});
	};

	private syncTransactions = ({
		response: { transactions: fetchedTransactions, ...rest },
		certified
	}: {
		response: GetTransactions & { transactions: TWithId[] };
		certified: boolean;
	}) => {
		const newTransactions = fetchedTransactions.filter(
			({ id }) => isNullish(this.transactions[`${id}`]) || !this.transactions[`${id}`].certified
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
				(acc: Record<string, CertifiedData<T>>, { id, transaction }) => ({
					...acc,
					[`${id}`]: {
						data: transaction as T,
						certified
					}
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
