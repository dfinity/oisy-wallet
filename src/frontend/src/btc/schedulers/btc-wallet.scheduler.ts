import { BTC_BALANCE_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import type { BtcTransactionUi, BtcWalletBalance } from '$btc/types/btc';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { mapBtcTransaction } from '$btc/utils/btc-blockstream.utils';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import { BTC_EXTENSION_FEATURE_FLAG_ENABLED } from '$env/btc.env';
import { BITCOIN_CANISTER_IDS } from '$env/networks/networks.icrc.env';
import { getBalanceQuery } from '$icp/api/bitcoin.api';
import { getBtcWalletBalance } from '$icp/utils/btc.utils';
import { getPendingBtcTransactions } from '$lib/api/backend.api';
import { getBtcBalance } from '$lib/api/signer.api';
import { FAILURE_THRESHOLD, WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { btcAddressTransactions, btcLatestBlockHeight } from '$lib/rest/blockstream.rest';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { BtcAddress } from '$lib/types/address';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import type { OptionCanisterIdText } from '$lib/types/canister';
import type {
	PostMessageDataRequestBtc,
	PostMessageDataResponseError
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import {
	mapCkBtcBitcoinNetworkToBackendBitcoinNetwork,
	mapToSignerBitcoinNetwork
} from '$lib/utils/network.utils';
import type { Identity } from '@dfinity/agent';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import {
	assertNonNullish,
	isNullish,
	jsonReplacer,
	nonNullish,
	queryAndUpdate,
	type QueryAndUpdateRequestParams
} from '@dfinity/utils';

interface LoadBtcWalletParams extends QueryAndUpdateRequestParams {
	bitcoinNetwork: BitcoinNetwork;
	btcAddress: BtcAddress;
	shouldFetchTransactions?: boolean;
	minterCanisterId?: OptionCanisterIdText;
}
interface BtcWalletStore {
	balance: CertifiedData<BtcWalletBalance | null> | undefined;
	transactions: Record<string, CertifiedData<BitcoinTransaction[]>>;
	latestBitcoinBlockHeight?: number;
}

interface BtcWalletData {
	balance: CertifiedData<BtcWalletBalance | null>;
	uncertifiedTransactions: CertifiedData<BtcTransactionUi>[];
	latestBitcoinBlockHeight?: number;
}

export class BtcWalletScheduler implements Scheduler<PostMessageDataRequestBtc> {
	private timer = new SchedulerTimer('syncBtcWalletStatus');

	private failedSyncCounter = 0;

	private store: BtcWalletStore = {
		balance: undefined,
		transactions: {},
		latestBitcoinBlockHeight: undefined
	};

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestBtc | undefined) {
		await this.timer.start<PostMessageDataRequestBtc>({
			interval: WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequestBtc | undefined) {
		await this.timer.trigger<PostMessageDataRequestBtc>({
			job: this.syncWallet,
			data
		});
	}

	private async loadBtcPendingTransactionsData({
		btcAddress,
		identity,
		bitcoinNetwork
	}: {
		btcAddress: BtcAddress;
		identity: Identity;
		bitcoinNetwork: BitcoinNetwork;
	}): Promise<{
		transactions: CertifiedData<PendingTransaction>[];
	}> {
		try {
			// Get pending transactions for balance calculation
			const pendingTransactions = await getPendingBtcTransactions({
				identity,
				network: mapCkBtcBitcoinNetworkToBackendBitcoinNetwork(bitcoinNetwork),
				address: btcAddress
			});

			return {
				transactions: pendingTransactions.map((transaction) => ({
					data: transaction,
					certified: false
				}))
			};
		} catch (error) {
			console.error('Error fetching pending BTC transactions:', error);
			return {
				transactions: []
			};
		}
	}
	private async loadBtcTransactionsData({ btcAddress }: { btcAddress: BtcAddress }): Promise<{
		transactions: CertifiedData<BtcTransactionUi>[];
		latestBitcoinBlockHeight: number;
	}> {
		try {
			const fetchedTransactions = await btcAddressTransactions({ btcAddress, bitcoinNetwork });

			const latestBitcoinBlockHeight = await btcLatestBlockHeight({ bitcoinNetwork });

			// Check if the block height has changed since last sync
			const blockHeightChanged = this.store.latestBitcoinBlockHeight !== latestBitcoinBlockHeight;

			// Only include transactions when they are not in store or block height has changed
			const newTransactions = fetchedTransactions.filter((transaction) => {
				// Include transactions that are NOT already in the store
				if (isNullish(this.store.transactions[`${transaction.txid}`])) {
					return true;
				}

				// If the block height has changed, include the transaction (confirmations may have changed)
				return blockHeightChanged;
			});

			return {
				transactions: newTransactions.map((transaction) => ({
					data: mapBtcTransaction({ transaction, btcAddress, latestBitcoinBlockHeight }),
					certified: false
				})),
				latestBitcoinBlockHeight
			};
		} catch (error) {
			// We don't want to disrupt the user experience if we can't fetch the transactions or latest block height.
			console.error('Error fetching BTC transactions data:', error);
			// TODO: Return an error instead of an empty array.
			return {
				transactions: [],
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
		uncertifiedTransactions = []
	}: Omit<LoadBtcWalletParams, 'shouldFetchTransactions'> & {
		pendingTransactions: CertifiedData<PendingTransaction>[];
		uncertifiedTransactions?: CertifiedData<BtcTransactionUi>[];
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

		// Calculate the structured balance using the uncertified transactions and pending transactions
		// Extract the actual pending transaction data from the CertifiedData wrapper
		const pendingTransactionData = pendingTransactions.map((certifiedTx) => certifiedTx.data);

		const structuredBalance = getBtcWalletBalance({
			balance: confirmedBalance,
			providerTransactions: uncertifiedTransactions,
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
	}: LoadBtcWalletParams) => {
		const transactionData =
			shouldFetchTransactions && !certified
				? await this.loadBtcTransactionsData({ btcAddress })
				: { transactions: [], latestBitcoinBlockHeight: this.store.latestBitcoinBlockHeight };

		const pendingTransactionData =
			nonNullish(identity) &&
			BTC_EXTENSION_FEATURE_FLAG_ENABLED &&
			shouldFetchTransactions &&
			!certified
				? await this.loadBtcPendingTransactionsData({
						btcAddress,
						identity,
						bitcoinNetwork
					})
				: { transactions: [] };

		const balance = await this.loadBtcBalance({
			identity,
			bitcoinNetwork,
			certified,
			btcAddress,
			minterCanisterId,
			pendingTransactions: pendingTransactionData.transactions,
			uncertifiedTransactions: transactionData.transactions
		});

		// TODO: investigate and implement "update" call for BTC transactions
		const transactionData =
			shouldFetchTransactions && !certified
				? await this.loadBtcTransactionsData({ btcAddress })
				: { transactions: [], latestBitcoinBlockHeight: this.store.latestBitcoinBlockHeight };

		return {
			balance,
			uncertifiedTransactions: transactionData.transactions,
			pendingTransactions: pendingTransactionData.transactions,
			latestBitcoinBlockHeight: transactionData.latestBitcoinBlockHeight
		};
	};

	private syncWallet = async ({ identity, data }: SchedulerJobData<PostMessageDataRequestBtc>) => {
		const bitcoinNetwork = data?.bitcoinNetwork;
		assertNonNullish(bitcoinNetwork, 'No BTC network provided to get BTC balance.');

		const btcAddress = data?.btcAddress.data;
		assertNonNullish(btcAddress, 'No BTC address provided to get BTC transactions.');

		await queryAndUpdate<BtcWalletData>({
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
					this.postMessageWalletError({ error });
				}
			},
			resolution: 'all_settled'
		});
	};

	private syncWalletData = ({
		response: { balance, uncertifiedTransactions, latestBitcoinBlockHeight }
	}: {
		response: BtcWalletData;
	}) => {
		const newBalance =
			isNullish(this.store.balance) ||
			// Compare balance data properly using JSON comparison for structured balance
			!btcWalletBalanceEquals({ a: this.store.balance.data, b: balance.data }) ||
			// TODO, align with sol-wallet.scheduler.ts, crash if certified changes
			(!this.store.balance.certified && balance.certified);

		const newTransactions = uncertifiedTransactions.length > 0;
		const blockHeightChanged =
			nonNullish(latestBitcoinBlockHeight) &&
			this.store.latestBitcoinBlockHeight !== latestBitcoinBlockHeight;

		this.store = {
			...this.store,
			...(newBalance && { balance }),
			...(newTransactions && {
				transactions: {
					...this.store.transactions,
					...uncertifiedTransactions.reduce(
						(acc, uncertifiedTransaction) => ({
							...acc,
							[uncertifiedTransaction.data.id]: uncertifiedTransaction
						}),
						{}
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
				newTransactions: JSON.stringify(uncertifiedTransactions, jsonReplacer)
			}
		});
	};

	private postMessageWallet(data: BtcPostMessageDataResponseWallet) {
		this.timer.postMsg<BtcPostMessageDataResponseWallet>({
			msg: 'syncBtcWallet',
			data
		});
	}

	protected postMessageWalletError({ error }: { error: unknown }) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: 'syncBtcWalletError',
			data: {
				error
			}
		});
	}
}
