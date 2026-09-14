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
import { consoleError } from '$lib/utils/console.utils';
import { loadSolNetworkBalances } from '$sol/services/sol-balances.services';
import {
	mapSolSourcesToTokens,
	resolveSolSignatures
} from '$sol/services/sol-resolve-signatures.services';
import { getSolSignatures } from '$sol/services/sol-signatures.services';
import { saveSolFinalizedTransactions } from '$sol/services/sol-user-transactions.services';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolNetworkBalances } from '$sol/types/sol-balance';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import type {
	SolResolvedTransaction,
	SolSignature,
	SolSignatureWithSources,
	SolTransactionUi
} from '$sol/types/sol-transaction';
import type { SplTokenAddress } from '$sol/types/spl';
import { solBackendTokenId } from '$sol/utils/user-transactions.utils';
import { assertNonNullish, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';

interface LoadSolWalletParams {
	address: SolAddress;
	network: SolanaNetworkType;
	tokens: PostMessageDataRequestSol['tokens'];
}

interface SolWalletStore {
	balances: SolNetworkBalances | undefined;
	// The newest slot the head check has resolved, and the signatures of that slot it has resolved.
	// Only a signature above that slot, or in it and not resolved yet, is new: anything older belongs
	// to the pagers, which keep their own cursors. So no older signature needs remembering, and a
	// long session does not pile them up. It is never inferred from what the UI store holds.
	newestSlot: SolSignature['slot'] | undefined;
	signatures: Set<string>;
}

interface SolWalletHead {
	// Every new signature of the head page, including those that derive to no record.
	signatures: SolSignatureWithSources[];
	transactions: SolResolvedTransaction[];
}

const initialStore = (): SolWalletStore => ({
	balances: undefined,
	newestSlot: undefined,
	signatures: new Set()
});

const dataKey = ({
	address: { data: address },
	solanaNetwork,
	tokens
}: PostMessageDataRequestSol): string =>
	JSON.stringify([
		solanaNetwork,
		address,
		tokens.map(({ address: tokenAddress, owner }) => `${tokenAddress}:${owner}`).sort()
	]);

const balancesEqual = ({
	current,
	next
}: {
	current: SolNetworkBalances;
	next: SolNetworkBalances;
}): boolean =>
	current.sol === next.sol &&
	Object.keys(current.spl).length === Object.keys(next.spl).length &&
	Object.entries(current.spl).every(([mint, balance]) => next.spl[mint] === balance);

/**
 * Syncs every balance and the newest history of one Solana network: the wallet and the associated
 * token account of each enabled SPL token. Each tick posts at most one message, with the balances and
 * the records it has not posted yet, each tagged with the sources whose history returned it.
 */
export class SolWalletScheduler implements Scheduler<PostMessageDataRequestSol> {
	#ref: PostMessageCommon['ref'] | undefined;
	#dataKey: string | undefined;

	private timer = new SchedulerTimer('syncSolWalletStatus');

	private store: SolWalletStore = initialStore();

	stop() {
		this.timer.stop();
	}

	// What the store holds is only valid for the address and token list it was built from.
	private setData(data: PostMessageDataRequestSol | undefined): { changed: boolean } {
		const key = nonNullish(data) ? dataKey(data) : undefined;
		const changed = key !== this.#dataKey;

		if (changed) {
			this.store = initialStore();
		}

		this.#dataKey = key;
		this.#ref = data?.solanaNetwork;

		return { changed };
	}

	async start(data: PostMessageDataRequestSol | undefined) {
		const previousKey = this.#dataKey;

		const { changed } = this.setData(data);

		// `SchedulerTimer.start` returns early while its timer runs, and that timer keeps the data it
		// was started with. Started again for another address or token list, it would go on syncing the
		// old one, so it is stopped first.
		if (changed && nonNullish(previousKey)) {
			this.timer.stop();
		}

		await this.timer.start<PostMessageDataRequestSol>({
			interval: SOL_WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestSol | undefined) {
		this.setData(data);

		await this.timer.trigger<PostMessageDataRequestSol>({
			job: this.syncWallet,
			data
		});
	}

	// The head check: the newest page of the merged pager, and only what is newer than what this
	// scheduler already holds. When nothing is, a tick costs one signature lookup per source.
	private loadHead = async ({
		address,
		network,
		tokens
	}: LoadSolWalletParams): Promise<SolWalletHead> => {
		// Known limit: this reads one page and drops its cursor. The pager holds the cut slot back in
		// the cursor, and returns an empty page while a source walks through a crowded slot, so when
		// more than a page of signatures arrives between two ticks, what lies between that page and
		// `newestSlot` is never loaded here. The head check that pages with the cursor and resumes the
		// walk on the next ticks follows in its own change.
		const { signatures } = await getSolSignatures({ address, network, tokensList: tokens });

		const { newestSlot, signatures: known } = this.store;

		const newSignatures = signatures.filter(
			({ signature, slot }) =>
				!known.has(signature) && (isNullish(newestSlot) || slot >= newestSlot)
		);

		if (newSignatures.length === 0) {
			return { signatures: [], transactions: [] };
		}

		return {
			signatures: newSignatures,
			transactions: await resolveSolSignatures({
				address,
				network,
				tokens,
				signatures: newSignatures,
				known
			})
		};
	};

	// The backend cache stays per token: each token's records under its own key, one save per token.
	private saveFinalizedTransactions = async ({
		identity,
		address,
		network,
		tokens,
		transactions
	}: LoadSolWalletParams & {
		identity: NullishIdentity;
		transactions: SolResolvedTransaction[];
	}) => {
		const sourceTokens = await mapSolSourcesToTokens({ address, tokens });

		const transactionsByToken = transactions.reduce((acc, { transaction, sources }) => {
			new Set(sources.map((source) => sourceTokens.get(source))).forEach((mint) => {
				if (mint !== undefined) {
					acc.set(mint, [...(acc.get(mint) ?? []), transaction]);
				}
			});

			return acc;
		}, new Map<SplTokenAddress | null, SolTransactionUi[]>());

		await Promise.all(
			[...transactionsByToken.entries()].map(([mint, tokenTransactions]) =>
				saveSolFinalizedTransactions({
					identity,
					tokenId: solBackendTokenId({ network, tokenAddress: mint ?? undefined }),
					transactions: tokenTransactions
				})
			)
		);
	};

	private loadAndSyncWalletData = async ({
		identity,
		data
	}: Required<SchedulerJobData<PostMessageDataRequestSol>>) => {
		const {
			address: { data: address },
			solanaNetwork: network,
			tokens
		} = data;

		const params: LoadSolWalletParams = { address, network, tokens };

		const [balances, head] = await Promise.all([
			loadSolNetworkBalances(params),
			this.loadHead(params)
		]);

		// Committed only once both loads succeeded: a retry after a failure must see the same
		// signatures as new again.
		const { hasChanges } = this.syncWalletData({ balances, head });

		if (!hasChanges) {
			return;
		}

		if (USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED && head.transactions.length > 0) {
			this.saveFinalizedTransactions({
				identity,
				...params,
				transactions: head.transactions
			}).catch((err) => consoleError('Background save of finalized SOL transactions failed:', err));
		}

		this.postMessageWallet({
			wallet: {
				balances,
				newTransactions: JSON.stringify(head.transactions, jsonReplacer)
			}
		});
	};

	private syncWallet = async ({ identity, data }: SchedulerJobData<PostMessageDataRequestSol>) => {
		assertNonNullish(data, 'No data provided to get Solana balance.');

		try {
			await retryWithDelay({
				request: async () => await this.loadAndSyncWalletData({ identity, data }),
				maxRetries: 10
			});
		} catch (error: unknown) {
			// Mirror the listener-side UI reset; otherwise the next sync only emits deltas and the UI stays empty.
			this.store = initialStore();
			this.postMessageWalletError({ error });
		}
	};

	private syncWalletData = ({
		balances,
		head: { signatures, transactions }
	}: {
		balances: SolNetworkBalances;
		head: SolWalletHead;
	}): { hasChanges: boolean } => {
		const newBalances =
			isNullish(this.store.balances) ||
			!balancesEqual({ current: this.store.balances, next: balances });

		const newestSlot = signatures.reduce<SolSignature['slot'] | undefined>(
			(acc, { slot }) => (isNullish(acc) || slot > acc ? slot : acc),
			this.store.newestSlot
		);

		this.store = {
			balances,
			newestSlot,
			signatures: new Set([
				...(newestSlot === this.store.newestSlot ? this.store.signatures : []),
				...signatures.filter(({ slot }) => slot === newestSlot).map(({ signature }) => signature)
			])
		};

		return { hasChanges: newBalances || transactions.length > 0 };
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
