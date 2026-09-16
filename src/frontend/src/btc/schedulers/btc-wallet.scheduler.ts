import { BTC_BALANCE_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import type { BtcAddress } from '$btc/types/address';
import {
	btcWalletBalanceEquals,
	type BtcTransactionUi,
	type BtcWalletBalance
} from '$btc/types/btc';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import { BTC_EXTENSION_FEATURE_FLAG_ENABLED } from '$env/btc.env';
import { BITCOIN_CANISTER_IDS } from '$env/tokens/tokens-icrc/tokens.icrc.ck.btc.env';
import { getBalanceQuery } from '$icp/api/bitcoin.api';
import { getBtcWalletBalance } from '$icp/utils/btc.utils';
import { getPendingBtcTransactions } from '$lib/api/backend.api';
import { getBtcBalance } from '$lib/api/signer.api';
import { FAILURE_THRESHOLD, WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { btcAddressData } from '$lib/rest/blockchain.rest';
import { btcLatestBlockHeight } from '$lib/rest/blockstream.rest';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import { createQueryAndUpdateWithWarmup } from '$lib/services/query.services';
import type { OptionCanisterIdText } from '$lib/types/canister';
import type {
	PostMessageCommon,
	PostMessageDataRequestBtc,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { consoleError } from '$lib/utils/console.utils';
import { extractIIDelegationChain } from '$lib/utils/delegation.utils';
import {
	mapCkBtcBitcoinNetworkToBackendBitcoinNetwork,
	mapToSignerBitcoinNetwork
} from '$lib/utils/network.utils';
import {
	assertNonNullish,
	isNullish,
	jsonReplacer,
	nonNullish,
	type QueryAndUpdateRequestParams
} from '@dfinity/utils';
import type { BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import type { Identity } from '@icp-sdk/core/agent';

interface LoadBtcWalletParams extends QueryAndUpdateRequestParams {
	bitcoinNetwork: BitcoinNetwork;
	btcAddress: BtcAddress;
	shouldFetchTransactions?: boolean;
	minterCanisterId?: OptionCanisterIdText;
}
interface BtcWalletStore {
	balance: CertifiedData<BtcWalletBalance | null> | undefined;
	transactions: Record<string, CertifiedData<BtcTransactionUi>>;
	latestBitcoinBlockHeight?: number;
	// The last successful fetch of the pending sends; `undefined` until one succeeds. Reused when a
	// later fetch fails, so a transient backend error does not make reserved funds look spendable.
	pendingTransactions?: CertifiedData<PendingTransaction>[];
}

interface BtcWalletData {
	balance: CertifiedData<BtcWalletBalance | null>;
	newTransactions: CertifiedData<BtcTransactionUi>[];
	latestBitcoinBlockHeight?: number;
}

const emptyBtcWalletStore = (): BtcWalletStore => ({
	balance: undefined,
	transactions: {},
	latestBitcoinBlockHeight: undefined,
	pendingTransactions: undefined
});

export class BtcWalletScheduler implements Scheduler<PostMessageDataRequestBtc> {
	private _queryAndUpdateWithWarmup?: ReturnType<typeof createQueryAndUpdateWithWarmup>;

	private get queryAndUpdateWithWarmup() {
		if (isNullish(this._queryAndUpdateWithWarmup)) {
			this._queryAndUpdateWithWarmup = createQueryAndUpdateWithWarmup();
		}

		return this._queryAndUpdateWithWarmup;
	}

	private ref: PostMessageCommon['ref'] | undefined;

	private timer = new SchedulerTimer('syncBtcWalletStatus');

	private failedSyncCounter = 0;

	// A fetch of the pending sends is owed. Set by a trigger and consumed just before a fetch
	// starts, so a trigger the timer drops while a sync is in flight is honoured by the next one.
	private forcePendingTransactions = false;

	private store: BtcWalletStore = emptyBtcWalletStore();

	stop() {
		this.timer.stop();
	}

	protected setRef(data: PostMessageDataRequestBtc | undefined) {
		const newRef = data?.btcAddress.data;

		// A scheduler re-keyed to another address must not filter or merge against the previous
		// address's state (mirrors sol-wallet.scheduler.ts).
		if (this.ref !== newRef) {
			this.store = emptyBtcWalletStore();
		}

		this.ref = newRef;
	}

	async start(data: PostMessageDataRequestBtc | undefined) {
		this.setRef(data);

		await this.timer.start<PostMessageDataRequestBtc>({
			interval: WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestBtc | undefined) {
		this.setRef(data);

		// A trigger follows a user action (e.g. a broadcast send), which is when new UTXOs get reserved.
		this.forcePendingTransactions = true;

		await this.timer.trigger<PostMessageDataRequestBtc>({
			job: this.syncWallet,
			data
		});
	}

	private async loadBtcPendingTransactionsData({
		identity,
		bitcoinNetwork
	}: {
		identity: Identity;
		bitcoinNetwork: BitcoinNetwork;
	}): Promise<CertifiedData<PendingTransaction>[] | null> {
		try {
			const pendingTransactions = await getPendingBtcTransactions({
				identity,
				network: mapCkBtcBitcoinNetworkToBackendBitcoinNetwork(bitcoinNetwork),
				iiDelegationChain: extractIIDelegationChain(identity)
			});

			return pendingTransactions.response.map((transaction) => ({
				data: transaction,
				certified: false
			}));
		} catch (error) {
			consoleError('Error fetching pending BTC transactions:', error);
			return null;
		}
	}

	private async loadBtcTransactionsData({ btcAddress }: { btcAddress: BtcAddress }): Promise<{
		newTransactions: CertifiedData<BtcTransactionUi>[];
		providerTransactions: CertifiedData<BtcTransactionUi>[];
		latestBitcoinBlockHeight: number;
	}> {
		try {
			const { txs: fetchedTransactions } = await btcAddressData({ btcAddress });

			const latestBitcoinBlockHeight = await btcLatestBlockHeight();

			// Check if the block height has changed since last sync
			const blockHeightChanged = this.store.latestBitcoinBlockHeight !== latestBitcoinBlockHeight;

			const providerTransactions = fetchedTransactions.map((transaction) => ({
				data: mapBtcTransaction({ transaction, btcAddress, latestBitcoinBlockHeight }),
				certified: false
			}));

			// Only include transactions when they are not in store or block height has changed
			const newTransactions = providerTransactions.filter(({ data: { id } }) => {
				// Include transactions that are NOT already in the store
				if (isNullish(this.store.transactions[`${id}`])) {
					return true;
				}

				// If the block height has changed, include the transaction (confirmations may have changed)
				return blockHeightChanged;
			});

			return {
				newTransactions,
				providerTransactions,
				latestBitcoinBlockHeight
			};
		} catch (_: unknown) {
			// TODO: Return an error instead of an empty array.
			return {
				newTransactions: [],
				providerTransactions: [],
				latestBitcoinBlockHeight: this.store.latestBitcoinBlockHeight ?? 0
			};
		}
	}

	private loadBtcBalance = async ({
		identity,
		bitcoinNetwork,
		btcAddress,
		minterCanisterId,
		certified = true,
		pendingTransactions = [],
		providerTransactions = []
	}: Omit<LoadBtcWalletParams, 'shouldFetchTransactions'> & {
		pendingTransactions: CertifiedData<PendingTransaction>[];
		providerTransactions?: CertifiedData<BtcTransactionUi>[];
	}): Promise<CertifiedData<BtcWalletBalance | null>> => {
		let confirmedBalance: BtcWalletBalance['confirmed'] | null;

		if (!certified) {
			confirmedBalance =
				nonNullish(minterCanisterId) && BITCOIN_CANISTER_IDS[minterCanisterId]
					? await getBalanceQuery({
							identity,
							network: bitcoinNetwork,
							address: btcAddress,
							bitcoinCanisterId: BITCOIN_CANISTER_IDS[minterCanisterId],
							minConfirmations: BTC_BALANCE_MIN_CONFIRMATIONS
						})
					: null;
		} else {
			confirmedBalance = await getBtcBalance({
				identity,
				network: mapToSignerBitcoinNetwork({
					network: bitcoinNetwork
				}),
				minConfirmations: BTC_BALANCE_MIN_CONFIRMATIONS
			});
		}

		// If no confirmed balance available, return null
		if (isNullish(confirmedBalance)) {
			return {
				data: null,
				certified
			};
		}

		// Calculate the structured balance using the provider transactions and pending transactions
		// Extract the actual pending transaction data from the CertifiedData wrapper
		const pendingTransactionData = pendingTransactions.map((certifiedTx) => certifiedTx.data);

		const structuredBalance = getBtcWalletBalance({
			balance: confirmedBalance,
			providerTransactions,
			pendingTransactions: pendingTransactionData
		});

		return {
			data: structuredBalance,
			certified
		};
	};

	private loadWalletData = async ({
		certified,
		identity,
		bitcoinNetwork,
		btcAddress,
		minterCanisterId,
		shouldFetchTransactions
	}: LoadBtcWalletParams): Promise<BtcWalletData> => {
		// Not gated on `certified`: after the query-only warm-up every sync is update-only, so the
		// certified pass is the only one left to refresh the provider transactions.
		const transactionData = shouldFetchTransactions
			? await this.loadBtcTransactionsData({ btcAddress })
			: {
					newTransactions: [],
					providerTransactions: [],
					latestBitcoinBlockHeight: this.store.latestBitcoinBlockHeight
				};

		// Each fetch of the pending sends costs the backend a Bitcoin canister `get_utxos` call, so
		// only fetch them when they can have changed: until a fetch has succeeded, after a trigger,
		// and while the previous fetch still reported reserved UTXOs (so `locked` is released once
		// the backend prunes the confirmed send).
		const { pendingTransactions: knownPendingTransactions } = this.store;

		const shouldFetchPendingTransactions =
			nonNullish(identity) &&
			BTC_EXTENSION_FEATURE_FLAG_ENABLED &&
			shouldFetchTransactions &&
			(this.forcePendingTransactions ||
				isNullish(knownPendingTransactions) ||
				knownPendingTransactions.length > 0);

		// Consumed before the fetch, so a trigger arriving while it is in flight owes the next sync
		// a fetch rather than being cleared by this one. A failed fetch still owes one.
		if (shouldFetchPendingTransactions) {
			this.forcePendingTransactions = false;
		}

		const pendingTransactions = shouldFetchPendingTransactions
			? await this.loadBtcPendingTransactionsData({
					identity,
					bitcoinNetwork
				})
			: null;

		if (shouldFetchPendingTransactions && isNullish(pendingTransactions)) {
			this.forcePendingTransactions = true;
		}

		// Persisted here rather than with the rest of the sync result: if the balance call below
		// fails, the reservation must not be lost, or the next sync would skip the fetch.
		if (nonNullish(pendingTransactions)) {
			this.store = { ...this.store, pendingTransactions };
		}

		const balance = await this.loadBtcBalance({
			identity,
			bitcoinNetwork,
			certified,
			btcAddress,
			minterCanisterId,
			// A failed fetch falls back to the last known reservations rather than to none, so the
			// balance does not briefly show funds a pending send has already spent.
			pendingTransactions: pendingTransactions ?? knownPendingTransactions ?? [],
			providerTransactions: transactionData.providerTransactions
		});

		return {
			balance,
			newTransactions: transactionData.newTransactions,
			latestBitcoinBlockHeight: transactionData.latestBitcoinBlockHeight
		};
	};

	private syncWallet = async ({ identity, data }: SchedulerJobData<PostMessageDataRequestBtc>) => {
		const bitcoinNetwork = data?.bitcoinNetwork;
		assertNonNullish(bitcoinNetwork, 'No BTC network provided to get BTC balance.');

		const btcAddress = data?.btcAddress.data;
		assertNonNullish(btcAddress, 'No BTC address provided to get BTC transactions.');

		await this.queryAndUpdateWithWarmup<BtcWalletData>({
			request: ({ identity: _, certified }) =>
				this.loadWalletData({
					certified,
					identity,
					btcAddress,
					bitcoinNetwork,
					shouldFetchTransactions: data?.shouldFetchTransactions,
					minterCanisterId: data?.minterCanisterId
				}),
			onLoad: ({ certified: _, ...rest }) => {
				this.syncWalletData(rest);
				this.failedSyncCounter = 0;
			},
			identity,
			onUpdateError: ({ error }) => {
				this.failedSyncCounter++;
				if (FAILURE_THRESHOLD <= this.failedSyncCounter) {
					// Mirror the listener-side UI reset; otherwise the next sync only emits deltas and the UI stays empty.
					this.store = emptyBtcWalletStore();
					this.postMessageWalletError({ error });
				}
			}
		});
	};

	private syncWalletData = ({
		response: { balance, newTransactions: fetchedTransactions, latestBitcoinBlockHeight }
	}: {
		response: BtcWalletData;
	}) => {
		const newBalance =
			isNullish(this.store.balance) ||
			// Compare balance data properly using JSON comparison for structured balance
			!btcWalletBalanceEquals({ a: this.store.balance.data, b: balance.data }) ||
			// TODO, align with sol-wallet.scheduler.ts, crash if certified changes
			(!this.store.balance.certified && balance.certified);

		const newTransactions = fetchedTransactions.length > 0;
		const blockHeightChanged =
			nonNullish(latestBitcoinBlockHeight) &&
			this.store.latestBitcoinBlockHeight !== latestBitcoinBlockHeight;

		this.store = {
			...this.store,
			...(newBalance && { balance }),
			...(newTransactions && {
				// Newer rows win: a re-emitted transaction carries the confirmations of the current height.
				transactions: {
					...this.store.transactions,
					...Object.fromEntries(
						fetchedTransactions.map((transaction) => [transaction.data.id, transaction])
					)
				}
			}),
			...(blockHeightChanged && { latestBitcoinBlockHeight })
		};

		if (!newBalance && !newTransactions) {
			return;
		}

		this.postMessageWallet({
			wallet: {
				balance,
				newTransactions: JSON.stringify(fetchedTransactions, jsonReplacer)
			}
		});
	};

	private postMessageWallet(data: BtcPostMessageDataResponseWallet) {
		if (isNullish(this.ref)) {
			return;
		}

		this.timer.postMsg<BtcPostMessageDataResponseWallet>({
			ref: this.ref,
			msg: 'syncBtcWallet',
			data
		});
	}

	protected postMessageWalletError({ error }: { error: unknown }) {
		if (isNullish(this.ref)) {
			return;
		}

		this.timer.postMsg<PostMessageDataResponseError>({
			ref: this.ref,
			msg: 'syncBtcWalletError',
			data: {
				error
			}
		});
	}
}
