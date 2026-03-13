import { SOL_WALLET_TIMER_INTERVAL_MILLIS, WALLET_PAGINATION } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import { retryWithDelay } from '$lib/services/rest.services';
import type { OptionIdentity } from '$lib/types/identity';
import type {
	PostMessageDataRequestSolBatch,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import type { Option } from '$lib/types/utils';
import { promiseAllLimited } from '$lib/utils/promise.utils';
import {
	fetchSignatures,
	fetchTransactionDetailForSignature,
	loadSolLamportsBalance
} from '$sol/api/solana.api';
import { fetchSolTransactionsForSignature } from '$sol/services/sol-transactions.services';
import { loadSplTokenBalance } from '$sol/services/spl-accounts.services';
import type { SolCertifiedTransaction } from '$sol/stores/sol-transactions.store';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolBalance } from '$sol/types/sol-balance';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import type { SolSignature } from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { assertNonNullish, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';
import { findAssociatedTokenPda } from '@solana-program/token';
import { address as solAddress } from '@solana/kit';

const TOKEN_CONCURRENCY = 5;
const TX_PREFETCH_CONCURRENCY = 10;

interface TokenGroup {
	address: SolAddress;
	network: SolanaNetworkType;
	tokens: PostMessageDataRequestSolBatch['tokens'];
}

interface SolWalletStore {
	balance: CertifiedData<Option<SolBalance>> | undefined;
	transactions: Record<string, SolCertifiedTransaction>;
}

interface SolWalletData {
	balance: CertifiedData<SolBalance | null>;
	transactions: SolCertifiedTransaction[];
}

export class SolWalletBatchScheduler implements Scheduler<PostMessageDataRequestSolBatch> {
	private timer = new SchedulerTimer('syncSolBatchWalletStatus');
	private stores = new Map<string, SolWalletStore>();

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestSolBatch | undefined) {
		await this.timer.start<PostMessageDataRequestSolBatch>({
			interval: SOL_WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncAllWallets,
			data
		});
	}

	async trigger(data: PostMessageDataRequestSolBatch | undefined) {
		await this.timer.trigger<PostMessageDataRequestSolBatch>({
			job: this.syncAllWallets,
			data
		});
	}

	private syncAllWallets = async ({
		identity,
		data
	}: SchedulerJobData<PostMessageDataRequestSolBatch>) => {
		assertNonNullish(data, 'No data provided for batch Solana wallet sync.');

		const groups = this.groupTokensByNetworkAndAddress(data.tokens);

		await Promise.all(groups.map((group) => this.processGroup({ identity, group })));
	};

	private groupTokensByNetworkAndAddress(
		tokens: PostMessageDataRequestSolBatch['tokens']
	): TokenGroup[] {
		const map = new Map<string, TokenGroup>();

		for (const token of tokens) {
			const key = `${token.address.data}-${token.solanaNetwork}`;
			let group = map.get(key);

			if (isNullish(group)) {
				group = {
					address: token.address.data,
					network: token.solanaNetwork,
					tokens: []
				};
				map.set(key, group);
			}

			group.tokens.push(token);
		}

		return [...map.values()];
	}

	private processGroup = async ({
		identity,
		group
	}: {
		identity: OptionIdentity;
		group: TokenGroup;
	}) => {
		const { address, network, tokens } = group;

		try {
			await retryWithDelay({
				request: async () => {
					// Phase 1: Fetch signatures for all tokens with bounded concurrency.
					// Each SPL token fetches from its ATA; native SOL fetches from the wallet address.
					const tokenSignatures = await promiseAllLimited({
						tasks: tokens.map((token) => async () => {
							const { tokenAddress, tokenOwnerAddress } = token;

							const [relevantAddress] =
								nonNullish(tokenAddress) && nonNullish(tokenOwnerAddress)
									? await findAssociatedTokenPda({
											owner: solAddress(address),
											tokenProgram: solAddress(tokenOwnerAddress),
											mint: solAddress(tokenAddress)
										})
									: [address];

							const signatures = await fetchSignatures({
								network,
								wallet: solAddress(relevantAddress),
								limit: Number(WALLET_PAGINATION)
							});

							return { token, signatures };
						}),
						concurrency: TOKEN_CONCURRENCY
					});

					// Phase 2: Deduplicate signatures and pre-fetch transaction details with bounded concurrency.
					// This is the key optimization: shared transactions are fetched once instead of N times.
					const allSignatures = tokenSignatures.flatMap(({ signatures }) => signatures);
					const uniqueSignatures = allSignatures.filter(
						(sig, index, self) => self.findIndex((s) => s.signature === sig.signature) === index
					);

					await promiseAllLimited({
						tasks: uniqueSignatures.map(
							(sig) => () => fetchTransactionDetailForSignature({ signature: sig, network })
						),
						concurrency: TX_PREFETCH_CONCURRENCY
					});

					// Phase 3: Process per-token transactions and balances with bounded concurrency.
					// Transaction details are cached from Phase 2, so the main work here is
					// instruction mapping (which calls getAccountInfo — batched via microtask).
					await promiseAllLimited({
						tasks: tokenSignatures.map(({ token, signatures }) => async () => {
							const { ref, tokenAddress, tokenOwnerAddress } = token;

							const [balance, transactions] = await Promise.all([
								this.loadBalance({ address, network, tokenAddress, tokenOwnerAddress }),
								this.loadTransactions({
									identity,
									ref,
									signatures,
									address,
									network,
									tokenAddress,
									tokenOwnerAddress
								})
							]);

							this.syncWalletData({ ref, response: { balance, transactions } });
						}),
						concurrency: TOKEN_CONCURRENCY
					});
				},
				maxRetries: 10
			});
		} catch (error: unknown) {
			for (const token of tokens) {
				this.postMessageWalletError({ ref: token.ref, error });
			}
		}
	};

	private loadBalance = async ({
		address,
		network,
		tokenAddress,
		tokenOwnerAddress
	}: {
		address: SolAddress;
		network: SolanaNetworkType;
		tokenAddress?: SplTokenAddress;
		tokenOwnerAddress?: SolAddress;
	}): Promise<CertifiedData<SolBalance | null>> => ({
		data:
			nonNullish(tokenAddress) && nonNullish(tokenOwnerAddress)
				? await loadSplTokenBalance({ address, network, tokenAddress, tokenOwnerAddress })
				: await loadSolLamportsBalance({ address, network }),
		certified: false
	});

	private loadTransactions = async ({
		identity,
		ref,
		signatures,
		address,
		network,
		tokenAddress,
		tokenOwnerAddress
	}: {
		identity: OptionIdentity;
		ref: string;
		signatures: SolSignature[];
		address: SolAddress;
		network: SolanaNetworkType;
		tokenAddress?: SplTokenAddress;
		tokenOwnerAddress?: SolAddress;
	}): Promise<SolCertifiedTransaction[]> => {
		// Process signatures in parallel instead of sequentially.
		// Transaction details are already cached from Phase 2, so the RPC cost
		// here is only from getAccountInfo calls (batched via microtask batching).
		const transactionArrays = await Promise.all(
			signatures.map((sig) =>
				fetchSolTransactionsForSignature({
					identity,
					signature: sig,
					network,
					address,
					tokenAddress,
					tokenOwnerAddress
				})
			)
		);

		const allTransactions = transactionArrays.flat();
		const certifiedTransactions = allTransactions.map((tx) => ({
			data: tx,
			certified: false
		}));

		const store = this.stores.get(ref) ?? { balance: undefined, transactions: {} };
		return certifiedTransactions.filter(({ data: { id } }) =>
			isNullish(store.transactions[`${id}`])
		);
	};

	private syncWalletData({
		ref,
		response: { balance, transactions }
	}: {
		ref: string;
		response: SolWalletData;
	}) {
		const store = this.stores.get(ref) ?? { balance: undefined, transactions: {} };

		if (!store.balance?.certified && balance.certified) {
			throw new Error('Balance certification status cannot change from uncertified to certified');
		}

		const newBalance = isNullish(store.balance) || store.balance.data !== balance.data;
		const newTransactions = transactions.length > 0;

		this.stores.set(ref, {
			...store,
			...(newBalance && { balance }),
			...(newTransactions && {
				transactions: {
					...store.transactions,
					...transactions.reduce(
						(acc, transaction) => ({
							...acc,
							[transaction.data.id]: transaction
						}),
						{}
					)
				}
			})
		});

		if (!newBalance && !newTransactions) {
			return;
		}

		this.postMessageWallet({
			ref,
			wallet: {
				balance,
				newTransactions: JSON.stringify(transactions, jsonReplacer)
			}
		});
	}

	private postMessageWallet({
		ref,
		wallet
	}: {
		ref: string;
		wallet: SolPostMessageDataResponseWallet['wallet'];
	}) {
		this.timer.postMsg<SolPostMessageDataResponseWallet>({
			ref,
			msg: 'syncSolWallet',
			data: { wallet }
		});
	}

	private postMessageWalletError({ ref, error }: { ref: string; error: unknown }) {
		this.timer.postMsg<PostMessageDataResponseError>({
			ref,
			msg: 'syncSolWalletError',
			data: { error }
		});
	}
}
