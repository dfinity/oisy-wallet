import type { Event } from '$declarations/xtc_ledger/xtc_ledger.did';
import { IcWalletScheduler, type IcWalletMsg } from '$icp/schedulers/ic-wallet.scheduler';
import type { Dip20TransactionWithId } from '$icp/types/api';
import type { IcTransactionAddOnsInfo, IcTransactionUi } from '$icp/types/ic-transaction';
import type { GetTransactions } from '$icp/types/ic.post-message';
import type { SchedulerJobData, SchedulerJobParams } from '$lib/schedulers/scheduler';
import type { PostMessageDataResponseWalletCleanUp } from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { Transaction, TransactionWithId } from '@dfinity/ledger-icp';
import type { IcrcTransaction, IcrcTransactionWithId } from '@dfinity/ledger-icrc';
import { isNullish, jsonReplacer, queryAndUpdate } from '@dfinity/utils';

type IndexedTransaction<T> = T & IcTransactionAddOnsInfo;

type IndexedTransactions<T> = Record<string, CertifiedData<IndexedTransaction<T>>>;

// Not reactive, only used to hold values imperatively.
interface IcWalletStore<T> {
	balance: CertifiedData<bigint> | undefined;
	transactions: IndexedTransactions<T>;
}

export type GetBalanceAndTransactions<
	TWithId extends IcrcTransactionWithId | TransactionWithId | Dip20TransactionWithId
> = GetTransactions & { transactions: TWithId[] };

export class IcWalletBalanceAndTransactionsScheduler<
	T extends IcrcTransaction | Transaction | Event,
	TWithId extends IcrcTransactionWithId | TransactionWithId | Dip20TransactionWithId,
	PostMessageDataRequest
> extends IcWalletScheduler<PostMessageDataRequest> {
	private store: IcWalletStore<T> = {
		balance: undefined,
		transactions: {}
	};

	private initialized = false;

	constructor(
		private getBalanceAndTransactions: (
			data: SchedulerJobParams<PostMessageDataRequest>
		) => Promise<GetBalanceAndTransactions<TWithId>>,
		private mapToSelfTransaction: (
			transaction: TWithId
		) => (Pick<TWithId, 'id'> & { transaction: IndexedTransaction<T> })[],
		private mapTransaction: (params: {
			transaction: Pick<TWithId, 'id'> & { transaction: IndexedTransaction<T> };
			jobData: SchedulerJobData<PostMessageDataRequest>;
		}) => IcTransactionUi,
		private msg: IcWalletMsg
	) {
		super();
	}

	/**
	 * @override
	 */
	protected syncWallet = async ({
		identity,
		...data
	}: SchedulerJobData<PostMessageDataRequest>) => {
		await queryAndUpdate<GetBalanceAndTransactions<TWithId>>({
			request: ({ identity: _, certified }) =>
				this.getBalanceAndTransactions({ ...data, identity, certified }),
			onLoad: ({ certified, ...rest }) => {
				this.syncTransactions({ jobData: { identity, ...data }, certified, ...rest });
				this.cleanTransactions({ certified });
			},
			onUpdateError: ({ error }) => this.postMessageWalletError({ msg: this.msg, error }),
			identity,
			resolution: 'all_settled'
		});
	};

	private syncTransactions = ({
		response: { transactions: fetchedTransactions, balance, ...rest },
		certified,
		jobData
	}: {
		response: GetBalanceAndTransactions<TWithId>;
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
				this.postMessageWalletBalanceAndTransactions({
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

		this.postMessageWalletBalanceAndTransactions({
			transactions: newUiTransactions,
			balance,
			certified,
			...rest
		});

		// If we have sent at least one postMessage we can consider the worker has being initialized.
		this.initialized = true;
	};

	private postMessageWalletBalanceAndTransactions({
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

		this.postMessageWallet({
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

	private postMessageWalletCleanUp(transactions: IndexedTransactions<T>) {
		this.timer.postMsg<PostMessageDataResponseWalletCleanUp>({
			msg: `${this.msg}CleanUp`,
			data: {
				transactionIds: Object.keys(transactions)
			}
		});
	}
}
