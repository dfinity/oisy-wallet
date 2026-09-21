import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { WALLET_PAGINATION, XRP_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import { retryWithDelay } from '$lib/services/rest.services';
import type {
	PostMessageCommon,
	PostMessageDataRequestXrp,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { loadXrpBalance, loadXrpTransactions } from '$xrp/rest/xrpl.rest';
import type { XrpCertifiedTransaction } from '$xrp/stores/xrp-transactions.store';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import { mapXrpTransaction } from '$xrp/utils/xrp-transaction.utils';
import { assertNonNullish, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';

interface XrpWalletStore {
	balance: CertifiedData<Nullish<XrpBalance>> | undefined;
	transactions: Record<string, XrpCertifiedTransaction>;
}

interface XrpWalletData {
	balance: CertifiedData<XrpBalance | null>;
	// `undefined` means the history could not be read this round, as distinct from an empty page.
	transactions: XrpCertifiedTransaction[] | undefined;
}

export class XrpWalletScheduler implements Scheduler<PostMessageDataRequestXrp> {
	#ref: PostMessageCommon['ref'] | undefined;

	private timer = new SchedulerTimer('syncXrpWalletStatus');

	private store: XrpWalletStore = {
		balance: undefined,
		transactions: {}
	};

	stop() {
		this.timer.stop();

		// The cache goes with the timer. Every caller that stops this scheduler is handing ownership
		// over — a changed address, a lost one, or a destroyed worker — and each one also clears the
		// UI store. Keeping the cache would make a restart on the SAME address diff its first page
		// against a full cache, report nothing new, and leave that cleared store empty: the account's
		// history would simply disappear until something else re-keyed the ref.
		this.setRef(undefined);
	}

	// The address is part of the ref, so a scheduler re-keyed to another address does not filter its
	// first sync against the previous address's balance (mirrors btc-wallet.scheduler.ts).
	private refFor = ({ xrpNetwork, address }: PostMessageDataRequestXrp): string =>
		`${XRP_TOKEN.symbol}-${xrpNetwork}-${address.data}`;

	protected setRef(data: PostMessageDataRequestXrp | undefined) {
		const newRef = nonNullish(data) ? this.refFor(data) : undefined;

		if (this.#ref !== newRef) {
			this.store = {
				balance: undefined,
				transactions: {}
			};
		}

		this.#ref = newRef;
	}

	async start(data: PostMessageDataRequestXrp | undefined) {
		this.setRef(data);

		await this.timer.start<PostMessageDataRequestXrp>({
			interval: XRP_WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestXrp | undefined) {
		this.setRef(data);

		await this.timer.trigger<PostMessageDataRequestXrp>({
			job: this.syncWallet,
			data
		});
	}

	private loadBalance = async ({
		address,
		xrpNetwork
	}: {
		address: PostMessageDataRequestXrp['address']['data'];
		xrpNetwork: PostMessageDataRequestXrp['xrpNetwork'];
	}): Promise<CertifiedData<XrpBalance | null>> => ({
		data: await loadXrpBalance({ address, network: xrpNetwork }),
		certified: false
	});

	// Returns only transactions not already emitted, so a re-sync posts just the delta.
	// `account_tx` returns newest-first; the store keeps them keyed by transaction hash.
	private loadTransactions = async ({
		address,
		xrpNetwork
	}: {
		address: PostMessageDataRequestXrp['address']['data'];
		xrpNetwork: PostMessageDataRequestXrp['xrpNetwork'];
	}): Promise<XrpCertifiedTransaction[]> => {
		const { transactions } = await loadXrpTransactions({
			address,
			network: xrpNetwork,
			limit: Number(WALLET_PAGINATION)
		});

		return transactions
			.map((transaction) => mapXrpTransaction({ transaction, xrpAddress: address }))
			.filter(nonNullish)
			.filter(({ id }) => isNullish(this.store.transactions[id]))
			.map((data) => ({ data, certified: false }));
	};

	private loadAndSyncWalletData = async ({
		data,
		expectedRef
	}: {
		data: PostMessageDataRequestXrp;
		expectedRef: string;
	}) => {
		const {
			address: { data: address },
			xrpNetwork
		} = data;

		// Settled independently, not `Promise.all`. The two come from different endpoints, and only
		// one of them justifies the reset that a rejection here ultimately triggers: `syncWalletError`
		// clears the balance AND the history. A stale balance on a funds screen is worse than none,
		// so a failed `account_info` stays fatal — but an `account_tx` outage used to erase a balance
		// that had just been read correctly, and discard history the user already had.
		const [balanceResult, transactionsResult] = await Promise.allSettled([
			this.loadBalance({ address, xrpNetwork }),
			this.loadTransactions({ address, xrpNetwork })
		]);

		if (balanceResult.status === 'rejected') {
			throw balanceResult.reason;
		}

		// `undefined`, not `[]`: the store keeps what it holds and stays uninitialized, and the next
		// tick tries again. The scheduler polls, so the in-job retries are not what makes history
		// arrive. Passing an empty array here claimed the account has no transactions.
		this.syncWalletData({
			balance: balanceResult.value,
			transactions:
				transactionsResult.status === 'fulfilled' ? transactionsResult.value : undefined,
			expectedRef
		});
	};

	private syncWallet = async ({ data }: SchedulerJobData<PostMessageDataRequestXrp>) => {
		assertNonNullish(data, 'No data provided to get XRP balance.');

		// The job snapshots the address it was scheduled with; the ref it belongs to is captured
		// alongside so a result landing after the scheduler was re-keyed can be discarded.
		const expectedRef = this.refFor(data);

		try {
			await retryWithDelay({
				request: async () => await this.loadAndSyncWalletData({ data, expectedRef }),
				maxRetries: 10
			});
		} catch (error: unknown) {
			// A failure for a superseded address must not reset the current account or report an
			// error against it.
			if (expectedRef !== this.#ref) {
				return;
			}

			// Mirror the listener-side UI reset; otherwise the next sync only emits deltas and the UI stays empty.
			this.store = {
				balance: undefined,
				transactions: {}
			};
			this.postMessageWalletError({ error });
		}
	};

	private syncWalletData = ({
		balance,
		transactions,
		expectedRef
	}: XrpWalletData & { expectedRef: string }) => {
		// Discard a result for an address the scheduler has moved on from, before it can be merged
		// into the store that `setRef` already cleared for the new address.
		if (expectedRef !== this.#ref) {
			return;
		}

		if (!this.store.balance?.certified && balance.certified) {
			throw new Error('Balance certification status cannot change from uncertified to certified');
		}

		const newBalance = isNullish(this.store.balance) || this.store.balance.data !== balance.data;
		const newTransactions = nonNullish(transactions) && transactions.length > 0;

		this.store = {
			...this.store,
			...(newBalance && { balance }),
			...(newTransactions && {
				transactions: {
					...this.store.transactions,
					...transactions.reduce(
						(acc, transaction) => ({ ...acc, [transaction.data.id]: transaction }),
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
				// Omitted when the history could not be read, so the listener leaves the store alone
				// rather than writing an empty page over an unknown one.
				...(nonNullish(transactions) && {
					newTransactions: JSON.stringify(transactions, jsonReplacer)
				})
			}
		});
	};

	private postMessageWallet(data: XrpPostMessageDataResponseWallet) {
		if (isNullish(this.#ref)) {
			return;
		}

		this.timer.postMsg<XrpPostMessageDataResponseWallet>({
			ref: this.#ref,
			msg: 'syncXrpWallet',
			data
		});
	}

	protected postMessageWalletError({ error }: { error: unknown }) {
		if (isNullish(this.#ref)) {
			return;
		}

		this.timer.postMsg<PostMessageDataResponseError>({
			ref: this.#ref,
			msg: 'syncXrpWalletError',
			data: {
				error
			}
		});
	}
}
