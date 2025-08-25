import type { IcTransactionAddOnsInfo } from '$icp/types/ic';
import type { GetTransactions } from '$icp/types/ic.post-message';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import type {
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp,
	PostMessageDataResponseWalletError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { Transaction, TransactionWithId } from '@dfinity/ledger-icp';
import type { IcrcTransaction, IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { isNullish, jsonReplacer } from '@dfinity/utils';
import {
	TimerWorkerUtils,
	type TimerWorkerUtilsJobData,
	type TimerWorkerUtilsJobParams
} from './timer.worker-utils';

type IndexedTransaction<T> = T & IcTransactionAddOnsInfo;

type IndexedTransactions<T> = Record<string, CertifiedData<IndexedTransaction<T>>>;

// Not reactive, only used to hold values imperatively.
interface WalletWorkerStore<T> {
	balance: CertifiedData<bigint> | undefined;
	transactions: IndexedTransactions<T>;
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
		private mapToSelfTransaction: (
			transaction: TWithId
		) => (Pick<TWithId, 'id'> & { transaction: IndexedTransaction<T> })[],
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
			onLoad: ({ certified, ...rest }) => {
				this.syncTransactions({ certified, ...rest });
				this.cleanTransactions({ certified });
			},
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

		const newExtendedTransactions = newTransactions.flatMap(this.mapToSelfTransaction);

		// Is the balance different from last value or has it become certified
		const newBalance =
			isNullish(this.store.balance) ||
			this.store.balance.data !== balance ||
			(!this.store.balance.certified && certified);

		if (newExtendedTransactions.length === 0 && !newBalance) {
			// We execute postMessage at least once because developer may have no transaction at all so, we want to display the balance zero
			if (!this.initialized) {
				this.postMessageWallet({
					transactions: newExtendedTransactions,
					balance,
					certified,
					...rest
				});

				this.initialized = true;
			}

			return;
		}

		this.store = {
			balance: { data: balance, certified },
			transactions: {
				...this.store.transactions,
				...newExtendedTransactions.reduce(
					(acc: Record<string, CertifiedData<IndexedTransaction<T>>>, { id, transaction }) => ({
						...acc,
						[`${id}`]: {
							data: transaction as IndexedTransaction<T>,
							certified
						}
					}),
					{}
				)
			}
		};

		this.postMessageWallet({
			transactions: newExtendedTransactions,
			balance,
			certified,
			...rest
		});
	};

	/**
	 * For security reason, everytime we get an update results we check if there are remaining transactions not certified in memory.
	 * If we find some, we prune those. Given that we are fetching transactions every X seconds, there should not be any query in memory when update calls have been resolved.
	 */
	private cleanTransactions({ certified }: { certified: boolean }) {
		if (!certified) {
			return;
		}

		const [certifiedTransactions, notCertifiedTransactions] = Object.entries(
			this.store.transactions
		).reduce(
			(
				[certified, notCertified]: [IndexedTransactions<T>, IndexedTransactions<T>],
				[key, data]
			) => [
				{
					...certified,
					...(data.certified && { [key]: data })
				},
				{
					...notCertified,
					...(!data.certified && { [key]: data })
				}
			],
			[{}, {}]
		);

		if (Object.keys(notCertifiedTransactions).length === 0) {
			// No not certified found.
			return;
		}

		this.postMessageWalletCleanUp(notCertifiedTransactions);

		this.store = {
			...this.store,
			transactions: {
				...certifiedTransactions
			}
		};
	}

	private postMessageWallet({
		transactions: newTransactions,
		balance: data,
		certified,
		...rest
	}: GetTransactions & {
		transactions: (Pick<TWithId, 'id'> & { transaction: IndexedTransaction<T> })[];
	} & {
		certified: boolean;
	}) {
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

	private postMessageWalletCleanUp(transactions: IndexedTransactions<T>) {
		this.worker.postMsg<PostMessageDataResponseWalletCleanUp>({
			msg: `${this.msg}CleanUp`,
			data: {
				transactionIds: Object.keys(transactions)
			}
		});
	}
}
