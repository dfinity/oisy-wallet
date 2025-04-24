import { SOL_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { SolAddress } from '$lib/types/address';
import type {
	PostMessageDataRequestSol,
	PostMessageDataRequestSolTransactions,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import type { SolCertifiedTransaction } from '$sol/stores/sol-transactions.store';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolPostMessageDataResponseWalletTransactions } from '$sol/types/sol-post-message';
import type { SplTokenAddress } from '$sol/types/spl';
import { assertNonNullish, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';

interface LoadSolWalletParams {
	solanaNetwork: SolanaNetworkType;
	address: SolAddress;
	tokenAddress?: SplTokenAddress;
	tokenOwnerAddress?: SolAddress;
}

interface SolWalletStore {
	transactions: Record<string, SolCertifiedTransaction>;
}

interface SolWalletData {
	transactions: SolCertifiedTransaction[];
}

export class SolWalletTransactionsScheduler
	implements Scheduler<PostMessageDataRequestSolTransactions>
{
	private timer = new SchedulerTimer('syncSolWalletTransactionsStatus');

	private store: SolWalletStore = {
		transactions: {}
	};

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestSol | undefined) {
		await this.timer.start<PostMessageDataRequestSol>({
			interval: SOL_WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestSol | undefined) {
		await this.timer.trigger<PostMessageDataRequestSol>({
			job: this.syncWallet,
			data
		});
	}

	private loadTransactions = async ({
		solanaNetwork: network,
		tokenAddress,
		tokenOwnerAddress,
		...rest
	}: LoadSolWalletParams): Promise<SolCertifiedTransaction[]> => {
		const transactions = await getSolTransactions({
			network,
			tokensList:
				nonNullish(tokenAddress) && nonNullish(tokenOwnerAddress)
					? [{ address: tokenAddress, owner: tokenOwnerAddress }]
					: [],
			...rest
		});

		const transactionsUi = transactions.map((transaction) => ({
			data: transaction,
			certified: false
		}));

		return transactionsUi.filter(({ data: { id } }) => isNullish(this.store.transactions[`${id}`]));
	};

	private syncWallet = async ({ data }: SchedulerJobData<PostMessageDataRequestSol>) => {
		assertNonNullish(data, 'No data provided to get Solana balance.');

		try {
			const {
				address: { data: address },
				...rest
			} = data;

			const transactions = await this.loadTransactions({
				address,
				...rest
			});

			this.syncWalletData({ response: { transactions } });
		} catch (error: unknown) {
			this.postMessageWalletError({ error });
		}
	};

	private syncWalletData = ({ response: { transactions } }: { response: SolWalletData }) => {
		const newTransactions = transactions.length > 0;

		this.store = {
			...this.store,

			...(newTransactions && {
				transactions: {
					...this.store.transactions,
					...transactions.reduce(
						(acc, transaction) => ({
							...acc,
							[transaction.data.id]: transaction
						}),
						{}
					)
				}
			})
		};

		if (!newTransactions) {
			return;
		}

		this.postMessageWallet({
			wallet: {
				newTransactions: JSON.stringify(transactions, jsonReplacer)
			}
		});
	};

	private postMessageWallet(data: SolPostMessageDataResponseWalletTransactions) {
		this.timer.postMsg<SolPostMessageDataResponseWalletTransactions>({
			msg: 'syncSolWalletTransactions',
			data
		});
	}

	protected postMessageWalletError({ error }: { error: unknown }) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: 'syncSolWalletTransactionsError',
			data: {
				error
			}
		});
	}
}
