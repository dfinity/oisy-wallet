import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { SolAddress } from '$lib/types/address';
import type {
	PostMessageDataRequestSol,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';
import { loadSolLamportsBalance, loadSplTokenBalance } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import type { SolCertifiedTransaction } from '$sol/stores/sol-transactions.store';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolBalance } from '$sol/types/sol-balance';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import type { SplTokenAddress } from '$sol/types/spl';
import { assertNonNullish, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';

interface LoadSolWalletParams {
	solanaNetwork: SolanaNetworkType;
	address: SolAddress;
	tokenAddress?: SplTokenAddress;
	tokenOwnerAddress?: SolAddress;
}

interface SolWalletStore {
	balance: CertifiedData<Option<SolBalance>> | undefined;
	transactions: Record<string, SolCertifiedTransaction>;
}

interface SolWalletData {
	balance: CertifiedData<SolBalance | null>;
	transactions: SolCertifiedTransaction[];
}

export class SolWalletScheduler implements Scheduler<PostMessageDataRequestSol> {
	private timer = new SchedulerTimer('syncSolWalletStatus');

	private store: SolWalletStore = {
		balance: undefined,
		transactions: {}
	};

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestSol | undefined) {
		await this.timer.start<PostMessageDataRequestSol>({
			interval: WALLET_TIMER_INTERVAL_MILLIS,
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

	private loadBalance = async ({
		address,
		solanaNetwork,
		tokenAddress
	}: LoadSolWalletParams): Promise<CertifiedData<SolBalance | null>> => ({
		data: nonNullish(tokenAddress)
			? await loadSplTokenBalance({ address, network: solanaNetwork, tokenAddress })
			: await loadSolLamportsBalance({ address, network: solanaNetwork }),
		certified: false
	});

	// TODO add unit tests for spl txns
	private loadTransactions = async ({
		address,
		solanaNetwork,
		tokenAddress,
		tokenOwnerAddress
	}: LoadSolWalletParams): Promise<SolCertifiedTransaction[]> => {
		const transactions = await getSolTransactions({
			network: solanaNetwork,
			address,
			tokenAddress,
			tokenOwnerAddress
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
				solanaNetwork,
				tokenAddress,
				tokenOwnerAddress
			} = data;

			const [balance, transactions] = await Promise.all([
				this.loadBalance({
					address,
					solanaNetwork,
					tokenAddress
				}),
				this.loadTransactions({
					address,
					solanaNetwork,
					tokenAddress,
					tokenOwnerAddress
				})
			]);

			this.syncWalletData({ response: { balance, transactions } });
		} catch (error: unknown) {
			this.postMessageWalletError({ error });
		}
	};

	private syncWalletData = ({
		response: { balance, transactions }
	}: {
		response: SolWalletData;
	}) => {
		if (!this.store.balance?.certified && balance.certified) {
			throw new Error('Balance certification status cannot change from uncertified to certified');
		}

		const newBalance = isNullish(this.store.balance) || this.store.balance.data !== balance.data;
		const newTransactions = transactions.length > 0;

		this.store = {
			...this.store,
			...(newBalance && { balance }),
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

		if (!newBalance && !newTransactions) {
			return;
		}

		this.postMessageWallet({
			wallet: {
				balance,
				newTransactions: JSON.stringify(transactions, jsonReplacer)
			}
		});
	};

	private postMessageWallet(data: SolPostMessageDataResponseWallet) {
		this.timer.postMsg<SolPostMessageDataResponseWallet>({
			msg: 'syncSolWallet',
			data
		});
	}

	protected postMessageWalletError({ error }: { error: unknown }) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: 'syncSolWalletError',
			data: {
				error
			}
		});
	}
}
