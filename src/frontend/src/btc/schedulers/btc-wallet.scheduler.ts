import { BTC_BALANCE_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import { BITCOIN_CANISTER_IDS } from '$env/networks.btc.env';
import { getBalanceQuery } from '$icp/api/bitcoin.api';
import { queryAndUpdate } from '$lib/actors/query.ic';
import { getBtcBalance } from '$lib/api/signer.api';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { btcAddressData } from '$lib/rest/blockchain.rest';
import { btcLatestBlockHeight } from '$lib/rest/blockstream.rest';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { BtcAddress } from '$lib/types/address';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import type { OptionCanisterIdText } from '$lib/types/canister';
import type { OptionIdentity } from '$lib/types/identity';
import type { PostMessageDataRequestBtc } from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import { type BitcoinNetwork } from '@dfinity/ckbtc';
import { assertNonNullish, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';

interface LoadBtcWalletParams {
	identity: OptionIdentity;
	bitcoinNetwork: BitcoinNetwork;
	certified: boolean;
	btcAddress: BtcAddress;
	shouldFetchTransactions?: boolean;
	minterCanisterId?: OptionCanisterIdText;
}
interface BtcWalletStore {
	balance: CertifiedData<bigint> | undefined;
	transactions: Record<string, CertifiedData<BitcoinTransaction[]>>;
}

interface BtcWalletData {
	balance: CertifiedData<bigint> | undefined;
	transactions: CertifiedData<BtcTransactionUi>[];
}

export class BtcWalletScheduler implements Scheduler<PostMessageDataRequestBtc> {
	private timer = new SchedulerTimer('syncBtcWalletStatus');

	private store: BtcWalletStore = {
		balance: undefined,
		transactions: {}
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

	private async loadBtcTransactionsData({
		btcAddress
	}: {
		btcAddress: BtcAddress;
	}): Promise<CertifiedData<BtcTransactionUi>[]> {
		try {
			const { txs: fetchedTransactions } = await btcAddressData({ btcAddress });

			const newTransactions = fetchedTransactions.filter(({ hash }) =>
				isNullish(this.store.transactions[`${hash}`])
			);

			const latestBitcoinBlockHeight = await btcLatestBlockHeight();

			return nonNullish(latestBitcoinBlockHeight)
				? newTransactions.map((transaction) => ({
						data: mapBtcTransaction({ transaction, btcAddress, latestBitcoinBlockHeight }),
						certified: false
					}))
				: [];
		} catch (error) {
			// We don't want to disrupt the user experience if we can't fetch the transactions or latest block height.
			console.error('Error fetching BTC transactions data:', error);
			// TODO: Return an error instead of an empty array.
			return [];
		}
	}

	private loadBtcBalance = async ({
		identity,
		bitcoinNetwork,
		btcAddress,
		minterCanisterId,
		certified = true
	}: Omit<LoadBtcWalletParams, 'shouldFetchTransactions'>): Promise<
		CertifiedData<bigint> | undefined
	> => {
		// Query BTC balance only if minterCanisterId is available
		if (!certified) {
			if (nonNullish(minterCanisterId) && isNullish(this.store.balance)) {
				return {
					data: await getBalanceQuery({
						identity,
						network: bitcoinNetwork,
						address: btcAddress,
						bitcoinCanisterId: BITCOIN_CANISTER_IDS[minterCanisterId]
					}),
					certified: false
				};
			}

			return;
		}

		return {
			data: await getBtcBalance({
				identity,
				network: mapToSignerBitcoinNetwork({
					network: bitcoinNetwork
				}),
				minConfirmations: BTC_BALANCE_MIN_CONFIRMATIONS
			}),
			certified: true
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
		const balance = await this.loadBtcBalance({
			identity,
			bitcoinNetwork,
			certified,
			btcAddress,
			minterCanisterId
		});

		// TODO: investigate and implement "update" call for BTC transactions
		const transactions =
			shouldFetchTransactions && !certified
				? await this.loadBtcTransactionsData({ btcAddress })
				: [];

		return { balance, transactions };
	};

	private syncWallet = async ({ identity, data }: SchedulerJobData<PostMessageDataRequestBtc>) => {
		const bitcoinNetwork = data?.bitcoinNetwork;
		assertNonNullish(bitcoinNetwork, 'No BTC network provided to get BTC balance.');

		const btcAddress = data?.btcAddress.data;
		assertNonNullish(btcAddress, 'No BTC address provided to get BTC transactions.');

		// TODO: implement "onCertifiedError" to handle errors in update calls
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
			onLoad: ({ certified, ...rest }) => this.syncWalletData({ certified, ...rest }),
			identity,
			resolution: 'all_settled'
		});
	};

	private syncWalletData = ({
		response: { balance, transactions }
	}: {
		response: BtcWalletData;
		certified: boolean;
	}) => {
		const newBalance =
			isNullish(this.store.balance) ||
			(nonNullish(balance) &&
				(this.store.balance.data !== balance.data ||
					(!this.store.balance.certified && balance.certified)));
		const newTransactions = transactions.length > 0;

		this.store = {
			...this.store,
			...(newBalance && { balance }),
			...(newTransactions && {
				transactions: {
					...this.store.transactions,
					...transactions.reduce(
						(acc, certifiedTransaction) => ({
							...acc,
							[certifiedTransaction.data.id]: certifiedTransaction
						}),
						{}
					)
				}
			})
		};

		if (isNullish(balance) || (!newBalance && !newTransactions)) {
			return;
		}

		this.postMessageWallet({
			wallet: {
				balance,
				newTransactions: JSON.stringify(transactions, jsonReplacer)
			}
		});
	};

	private postMessageWallet(data: BtcPostMessageDataResponseWallet) {
		this.timer.postMsg<BtcPostMessageDataResponseWallet>({
			msg: 'syncBtcWallet',
			data
		});
	}
}
