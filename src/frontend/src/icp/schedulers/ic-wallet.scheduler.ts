import type { IcTransactionAddOnsInfo, IcTransactionUi } from '$icp/types/ic-transaction';
import type { GetTransactions } from '$icp/types/ic.post-message';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import {
	SchedulerTimer,
	type Scheduler,
	type SchedulerJobData,
	type SchedulerJobParams
} from '$lib/schedulers/scheduler';
import type {
	PostMessageDataResponseError,
	PostMessageDataResponseWallet,
	PostMessageDataResponseWalletCleanUp
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { Transaction, TransactionWithId } from '@dfinity/ledger-icp';
import type { IcrcTransaction, IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { isNullish, jsonReplacer } from '@dfinity/utils';

type IndexedTransaction<T> = T & IcTransactionAddOnsInfo;

type IndexedTransactions<T> = Record<string, CertifiedData<IndexedTransaction<T>>>;

// Not reactive, only used to hold values imperatively.
interface IcWalletStore<T> {
	balance: CertifiedData<bigint> | undefined;
	transactions: IndexedTransactions<T>;
}

export class IcWalletScheduler<
	T extends IcrcTransaction | Transaction,
	TWithId extends IcrcTransactionWithId | TransactionWithId,
	PostMessageDataRequest
> implements Scheduler<PostMessageDataRequest>
{
	private timer = new SchedulerTimer('syncIcWalletStatus');

	private store: IcWalletStore<T> = {
		balance: undefined,
		transactions: {}
	};

	private initialized = false;

	constructor(
		private getTransactions: (
			data: SchedulerJobParams<PostMessageDataRequest>
		) => Promise<GetTransactions & { transactions: TWithId[] }>,
		private mapToSelfTransaction: (
			transaction: TWithId
		) => (Pick<TWithId, 'id'> & { transaction: IndexedTransaction<T> })[],
		private mapTransaction: (params: {
			transaction: Pick<TWithId, 'id'> & { transaction: IndexedTransaction<T> };
			jobData: SchedulerJobData<PostMessageDataRequest>;
		}) => IcTransactionUi,
		private msg: 'syncIcpWallet' | 'syncIcrcWallet'
	) {}

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequest | undefined) {
		await this.timer.start<PostMessageDataRequest>({
			interval: WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequest | undefined) {
		await this.timer.trigger<PostMessageDataRequest>({
			job: this.syncWallet,
			data
		});
	}

	private syncWallet = async ({ identity, ...data }: SchedulerJobData<PostMessageDataRequest>) => {
		await queryAndUpdate<GetTransactions & { transactions: TWithId[] }>({
			request: ({ identity: _, certified }) =>
				this.getTransactions({ ...data, identity, certified }),
			onLoad: ({ certified, ...rest }) => {
				this.syncTransactions({ jobData: { identity, ...data }, certified, ...rest });
				this.cleanTransactions({ certified });
			},
			onCertifiedError: ({ error }) => this.postMessageWalletError(error),
			identity,
			resolution: 'all_settled'
		});
	};

	private syncTransactions = ({
		response: { transactions: fetchedTransactions, balance, ...rest },
		certified,
		jobData
	}: {
		response: GetTransactions & { transactions: TWithId[] };
		certified: boolean;
		jobData: SchedulerJobData<PostMessageDataRequest>;
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
					transactions: [],
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
							data: transaction,
							certified
						}
					}),
					{}
				)
			}
		};

		const newUiTransactions = newExtendedTransactions.map((transaction) =>
			this.mapTransaction({ transaction, jobData })
		);

		this.postMessageWallet({
			transactions: newUiTransactions,
			balance,
			certified,
			...rest
		});

		// If we have sent at least one postMessage we can consider the worker has being initialized.
		this.initialized = true;
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
		transactions: IcTransactionUi[];
	} & {
		certified: boolean;
	}) {
		const certifiedTransactions = newTransactions.map((data) => ({ data, certified }));

		this.timer.postMsg<PostMessageDataResponseWallet>({
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
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: `${this.msg}Error`,
			data: {
				error
			}
		});
	}

	private postMessageWalletCleanUp(transactions: IndexedTransactions<T>) {
		this.timer.postMsg<PostMessageDataResponseWalletCleanUp>({
			msg: `${this.msg}CleanUp`,
			data: {
				transactionIds: Object.keys(transactions)
			}
		});
	}
}
