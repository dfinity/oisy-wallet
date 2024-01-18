import { queryAndUpdate } from '$lib/actors/query.ic';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type {
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletError
} from '$lib/types/post-message';
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

// Not reactive, only used to hold values imperatively.
interface WalletWorkerStore<T> {
	balance: CertifiedData<bigint> | undefined;
	transactions: Record<string, CertifiedData<T>>;
}

export class WalletWorkerUtils<
	T extends IcrcTransaction | Transaction,
	TWithId extends IcrcTransactionWithId | TransactionWithId,
	PostMessageDataRequest
> {
	private worker = new TimerWorkerUtils();

	private store: WalletWorkerStore<T> = {
		balance: undefined,
		transactions: {}
	};

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
			onCertifiedError: ({ error }) => this.postMessageWalletError(error),
			identity,
			resolution: 'all_settled'
		});
	};

	private syncTransactions = ({
		response: { transactions: fetchedTransactions, balance, ...rest },
		certified
	}: {
		response: GetTransactions & { transactions: TWithId[] };
		certified: boolean;
	}) => {
		// Is there any new transactions unknown so far or which has become certified
		const newTransactions = fetchedTransactions.filter(
			({ id }) =>
				isNullish(this.store.transactions[`${id}`]) || !this.store.transactions[`${id}`].certified
		);

		// Is the balance different from last value or has it become certified
		const newBalance =
			isNullish(this.store.balance) ||
			this.store.balance.data !== balance ||
			(!this.store.balance.certified && certified);

		if (newTransactions.length === 0 && !newBalance) {
			// We execute postMessage at least once because developer may have no transaction at all so, we want to display the balance zero
			if (!this.initialized) {
				this.postMessageWallet({ transactions: newTransactions, balance, certified, ...rest });

				this.initialized = true;
			}

			return;
		}

		this.store = {
			balance: { data: balance, certified },
			transactions: {
				...this.store.transactions,
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
			}
		};

		this.postMessageWallet({
			transactions: newTransactions,
			balance,
			certified,
			...rest
		});
	};

	private postMessageWallet({
		transactions: newTransactions,
		balance: data,
		certified,
		...rest
	}: GetTransactions & { transactions: TWithId[] } & { certified: boolean }) {
		const certifiedTransactions = newTransactions.map((data) => ({ data, certified }));

		this.worker.postMsg<PostMessageDataResponseWallet<GetTransactions>>({
			msg: this.msg,
			data: {
				wallet: {
					balance: {
						data,
						certified
					},
					...rest,
					newTransactions: JSON.stringify(
						Object.entries(certifiedTransactions).map(([_id, transaction]) => transaction),
						jsonReplacer
					)
				}
			}
		});
	}

	private postMessageWalletError(error: unknown) {
		this.worker.postMsg<PostMessageDataResponseWalletError>({
			msg: `${this.msg}Error`,
			data: {
				error
			}
		});
	}
}
