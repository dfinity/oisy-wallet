import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { XRP_TRUST_LINE_TOKENS_ENABLED } from '$env/xrp-trust-line-tokens.env';
import { WALLET_PAGINATION, XRP_WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import { retryWithDelay } from '$lib/services/rest.services';
import type {
	PostMessageCommon,
	PostMessageDataRequestXrp,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { loadXrpAccountLines, loadXrpBalance, loadXrpTransactions } from '$xrp/rest/xrpl.rest';
import type { XrpCertifiedTransaction } from '$xrp/stores/xrp-transactions.store';
import type { XrpBalance } from '$xrp/types/xrp-balance';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
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
	// `undefined` means the lines were not read this round — they could not be, or trust-line tokens
	// are off — as distinct from an account that has none.
	trustLines: XrpTrustLine[] | undefined;
}

export class XrpWalletScheduler implements Scheduler<PostMessageDataRequestXrp> {
	#ref: PostMessageCommon['ref'] | undefined;

	// Whether a successful history page has reached the UI for the current ref. The first one is
	// news even when empty: it is what tells the store the history has been read at all, and
	// without it an account with no transactions — after a tick where `account_tx` failed — never
	// leaves the loading state, because neither the balance nor the row count has changed.
	#historyPublished = false;

	// The trust lines last posted for the current ref, serialized. Lines are posted when they differ
	// from it, so an unchanged account costs no message, and the first read is always news.
	#trustLinesPublished: string | undefined;

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
			this.#historyPublished = false;
			this.#trustLinesPublished = undefined;
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

	// The two come from different endpoints and are treated differently on failure. Only the
	// balance justifies the reset a rejection here ultimately triggers — `syncWalletError` clears
	// it, and a stale figure on a funds screen is worse than none — so a failed `account_info`
	// stays fatal while an `account_tx` outage leaves the history alone.
	//
	// The history is fetched ONCE per tick and awaited here, outside the retry in `syncWallet`.
	// Inside it, a balance failure re-ran a perfectly good `account_tx` on every attempt — eleven
	// calls for one tick — and that amplification lands exactly when the provider is already
	// failing, which is when a retry should be doing the opposite.
	private loadAndSyncBalance = async ({
		data,
		expectedRef,
		transactions,
		trustLines
	}: {
		data: PostMessageDataRequestXrp;
		expectedRef: string;
		transactions: Promise<XrpCertifiedTransaction[] | undefined>;
		trustLines: Promise<XrpTrustLine[] | undefined>;
	}) => {
		const {
			address: { data: address },
			xrpNetwork
		} = data;

		const balance = await this.loadBalance({ address, xrpNetwork });

		// `undefined`, not `[]`, when the history could not be read: the store keeps what it holds
		// and stays uninitialized, and the next tick tries again. An empty array claimed the account
		// has no transactions.
		this.syncWalletData({
			balance,
			transactions: await transactions,
			trustLines: await trustLines,
			expectedRef
		});
	};

	private syncWallet = async ({ data }: SchedulerJobData<PostMessageDataRequestXrp>) => {
		assertNonNullish(data, 'No data provided to get XRP balance.');

		// The job snapshots the address it was scheduled with; the ref it belongs to is captured
		// alongside so a result landing after the scheduler was re-keyed can be discarded.
		const expectedRef = this.refFor(data);

		const {
			address: { data: address },
			xrpNetwork
		} = data;

		// Started once, before the retry loop, and its rejection folded into `undefined` here so a
		// history outage neither fails the tick nor surfaces as an unhandled rejection when the
		// balance exhausts its retries.
		const transactions = this.loadTransactions({ address, xrpNetwork }).then(
			(loaded) => loaded,
			() => undefined
		);

		// Once per tick and folded into `undefined` on failure, like the history and for the same
		// reasons: a trust-line outage must neither fail the tick nor reset the XRP balance, and a
		// retry of the balance must not re-read the lines.
		const trustLines = XRP_TRUST_LINE_TOKENS_ENABLED
			? loadXrpAccountLines({ address, network: xrpNetwork }).then(
					(loaded) => loaded,
					() => undefined
				)
			: Promise.resolve(undefined);

		try {
			await retryWithDelay({
				request: async () =>
					await this.loadAndSyncBalance({ data, expectedRef, transactions, trustLines }),
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
		trustLines,
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

		// The first successful page passes even when it changes nothing, because "there is no history"
		// and "the history has not been read" are different states and only a delivered page tells
		// them apart.
		const firstHistory = nonNullish(transactions) && !this.#historyPublished;

		const serializedTrustLines = nonNullish(trustLines) ? JSON.stringify(trustLines) : undefined;
		const newTrustLines =
			nonNullish(serializedTrustLines) && serializedTrustLines !== this.#trustLinesPublished;

		if (!newBalance && !newTransactions && !firstHistory && !newTrustLines) {
			return;
		}

		if (nonNullish(transactions)) {
			this.#historyPublished = true;
		}

		if (newTrustLines) {
			this.#trustLinesPublished = serializedTrustLines;
		}

		this.postMessageWallet({
			wallet: {
				balance,
				// Omitted when the history could not be read, so the listener leaves the store alone
				// rather than writing an empty page over an unknown one.
				...(nonNullish(transactions) && {
					newTransactions: JSON.stringify(transactions, jsonReplacer)
				}),
				// Omitted when unchanged or not read, so the listener keeps what it holds.
				...(newTrustLines && { trustLines })
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
