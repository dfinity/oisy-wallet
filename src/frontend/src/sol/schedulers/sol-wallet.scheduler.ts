import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED } from '$env/user-transactions.env';
import { SOL_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import { retryWithDelay } from '$lib/services/rest.services';
import type { NullishIdentity } from '$lib/types/identity';
import type {
	PostMessageCommon,
	PostMessageDataRequestSol,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { consoleError } from '$lib/utils/console.utils';
import { loadSolLamportsBalance } from '$sol/api/solana.api';
import { getSolTransactions } from '$sol/services/sol-signatures.services';
import {
	loadSolUserTransactions,
	saveSolFinalizedTransactions
} from '$sol/services/sol-user-transactions.services';
import { loadSplTokenBalance } from '$sol/services/spl-accounts.services';
import type { SolCertifiedTransaction } from '$sol/stores/sol-transactions.store';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolBalance } from '$sol/types/sol-balance';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import type { SplTokenAddress } from '$sol/types/spl';
import { solBackendTokenId } from '$sol/utils/user-transactions.utils';
import { assertNonNullish, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

interface LoadSolWalletParams {
	identity: NullishIdentity;
	solanaNetwork: SolanaNetworkType;
	address: SolAddress;
	tokenAddress?: SplTokenAddress;
	tokenOwnerAddress?: SolAddress;
}

interface SolWalletStore {
	balance: CertifiedData<Nullish<SolBalance>> | undefined;
	transactions: Record<string, SolCertifiedTransaction>;
}

interface SolWalletData {
	balance: CertifiedData<SolBalance | null>;
	transactions: SolCertifiedTransaction[];
}

export class SolWalletScheduler implements Scheduler<PostMessageDataRequestSol> {
	#ref: PostMessageCommon['ref'] | undefined;

	private timer = new SchedulerTimer('syncSolWalletStatus');

	private store: SolWalletStore = {
		balance: undefined,
		transactions: {}
	};

	stop() {
		this.timer.stop();
	}

	protected setRef(data: PostMessageDataRequestSol | undefined) {
		const newRef = nonNullish(data)
			? `${data.tokenAddress ?? SOLANA_TOKEN.symbol}-${data.solanaNetwork}`
			: undefined;

		if (this.#ref !== newRef) {
			this.store = {
				balance: undefined,
				transactions: {}
			};
		}

		this.#ref = newRef;
	}

	async start(data: PostMessageDataRequestSol | undefined) {
		this.setRef(data);

		await this.timer.start<PostMessageDataRequestSol>({
			interval: SOL_WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestSol | undefined) {
		this.setRef(data);

		await this.timer.trigger<PostMessageDataRequestSol>({
			job: this.syncWallet,
			data
		});
	}

	private loadBalance = async ({
		address,
		solanaNetwork: network,
		tokenAddress,
		tokenOwnerAddress
	}: LoadSolWalletParams): Promise<CertifiedData<SolBalance | null>> => ({
		data:
			nonNullish(tokenAddress) && nonNullish(tokenOwnerAddress)
				? await loadSplTokenBalance({
						address,
						network,
						tokenAddress,
						tokenOwnerAddress
					})
				: await loadSolLamportsBalance({ address, network }),
		certified: false
	});

	private loadTransactions = async ({
		identity,
		solanaNetwork: network,
		address,
		tokenAddress,
		tokenOwnerAddress
	}: LoadSolWalletParams): Promise<SolCertifiedTransaction[]> => {
		const isInitialSync = Object.keys(this.store.transactions).length === 0;

		let storedTransactions: SolCertifiedTransaction[] = [];

		if (isInitialSync && USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED) {
			try {
				const backendTokenId = solBackendTokenId({ network, tokenAddress });

				const stored = await loadSolUserTransactions({
					identity,
					tokenId: backendTokenId,
					address
				});

				if (nonNullish(stored) && stored.transactions.length > 0) {
					storedTransactions = stored.transactions.map((transaction) => ({
						data: transaction,
						certified: false
					}));

					for (const tx of storedTransactions) {
						this.store.transactions[tx.data.id] = tx;
					}
				}
			} catch (_: unknown) {
				// Backend load failure is non-critical; fall through to RPC
			}
		}

		const rpcTransactions = await getSolTransactions({
			network,
			identity,
			address,
			tokenAddress,
			tokenOwnerAddress
		});

		const rpcCertified = rpcTransactions.map((transaction) => ({
			data: transaction,
			certified: false
		}));

		const newRpcTransactions = rpcCertified.filter(({ data: { id } }) =>
			isNullish(this.store.transactions[`${id}`])
		);

		if (USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED && newRpcTransactions.length > 0) {
			const backendTokenId = solBackendTokenId({ network, tokenAddress });
			saveSolFinalizedTransactions({
				identity,
				tokenId: backendTokenId,
				transactions: newRpcTransactions.map(({ data }) => data)
			}).catch((err) => consoleError('Background save of finalized SOL transactions failed:', err));
		}

		return [...newRpcTransactions, ...storedTransactions];
	};

	private loadAndSyncWalletData = async ({
		identity,
		data
	}: Required<SchedulerJobData<PostMessageDataRequestSol>>) => {
		const {
			address: { data: address },
			...rest
		} = data;

		const [balance, transactions] = await Promise.all([
			this.loadBalance({
				identity,
				address,
				...rest
			}),
			this.loadTransactions({
				identity,
				address,
				...rest
			})
		]);

		this.syncWalletData({ response: { balance, transactions } });
	};

	private syncWallet = async ({ identity, data }: SchedulerJobData<PostMessageDataRequestSol>) => {
		assertNonNullish(data, 'No data provided to get Solana balance.');

		try {
			await retryWithDelay({
				request: async () => await this.loadAndSyncWalletData({ identity, data }),
				maxRetries: 10
			});
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
		if (isNullish(this.#ref)) {
			return;
		}

		this.timer.postMsg<SolPostMessageDataResponseWallet>({
			ref: this.#ref,
			msg: 'syncSolWallet',
			data
		});
	}

	protected postMessageWalletError({ error }: { error: unknown }) {
		if (isNullish(this.#ref)) {
			return;
		}

		this.timer.postMsg<PostMessageDataResponseError>({
			ref: this.#ref,
			msg: 'syncSolWalletError',
			data: {
				error
			}
		});
	}
}
