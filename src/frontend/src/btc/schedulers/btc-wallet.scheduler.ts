import { BTC_BALANCE_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import type { BitcoinNetwork } from '$declarations/signer/signer.did';
import { getBtcBalance } from '$lib/api/signer.api';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { btcAddressData } from '$lib/rest/blockchain.rest';
import { btcLatestBlockHeight } from '$lib/rest/blockstream.rest';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { BtcAddress } from '$lib/types/address';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import type { OptionIdentity } from '$lib/types/identity';
import type { PostMessageDataRequestBtc } from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { assertNonNullish, isNullish, jsonReplacer, nonNullish } from '@dfinity/utils';

interface BtcWalletStore {
	balance: CertifiedData<bigint> | undefined;
	transactions: Record<string, CertifiedData<BitcoinTransaction[]>>;
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

	private async loadBtcTransactionsData({ btcAddress }: { btcAddress: BtcAddress }): Promise<{
		newTransactions: BitcoinTransaction[];
		latestBitcoinBlockHeight: number | undefined;
	}> {
		try {
			const { txs: fetchedTransactions } = await btcAddressData({ btcAddress });

			const newTransactions = fetchedTransactions.filter(({ hash }) =>
				isNullish(this.store.transactions[`${hash}`])
			);

			this.store = {
				...this.store,
				transactions: {
					...this.store.transactions,
					...newTransactions.reduce(
						(acc, transaction) => ({
							...acc,
							[transaction.hash]: {
								certified: false,
								data: transaction
							}
						}),
						{}
					)
				}
			};

			const latestBitcoinBlockHeight = await btcLatestBlockHeight();

			return { newTransactions, latestBitcoinBlockHeight };
		} catch (error) {
			// We don't want to disrupt the user experience if we can't fetch the transactions or latest block height.
			console.error('Error fetching BTC transactions data:', error);
			// TODO: Return an error instead of an object with empty array.
			return { newTransactions: [], latestBitcoinBlockHeight: undefined };
		}
	}

	private async loadBtcBalance({
		identity,
		bitcoinNetwork
	}: {
		identity: OptionIdentity;
		bitcoinNetwork: BitcoinNetwork;
	}): Promise<CertifiedData<bigint>> {
		const balance = await getBtcBalance({
			identity,
			network: bitcoinNetwork,
			minConfirmations: BTC_BALANCE_MIN_CONFIRMATIONS
		});
		const certifiedBalance = {
			data: balance,
			certified: true
		};

		this.store = {
			...this.store,
			balance: certifiedBalance
		};

		return certifiedBalance;
	}

	/* TODO: The following steps need to be done:
	 * 1. [Required] Fetch uncertified transactions via BTC transaction API.
	 * 2. [Improvement] Query uncertified balance in oder to improve UX (signer.getBtcBalance takes ~5s to complete).
	 * 3. [Required] Fetch certified transactions via BE endpoint (to be discussed).
	 * */
	private syncWallet = async ({ identity, data }: SchedulerJobData<PostMessageDataRequestBtc>) => {
		const bitcoinNetwork = data?.bitcoinNetwork;
		assertNonNullish(bitcoinNetwork, 'No BTC network provided to get BTC certified balance.');

		const btcAddress = data?.btcAddress.data;
		assertNonNullish(btcAddress, 'No BTC address provided to get BTC transactions.');

		const balance = await this.loadBtcBalance({ identity, bitcoinNetwork });
		const { newTransactions, latestBitcoinBlockHeight } =
			nonNullish(data) && data.shouldFetchTransactions
				? await this.loadBtcTransactionsData({ btcAddress })
				: { newTransactions: [], latestBitcoinBlockHeight: undefined };

		// TODO: handle the case when tx data is available but latestBitcoinBlockHeight is undefined
		const uncertifiedTransactions = nonNullish(latestBitcoinBlockHeight)
			? newTransactions.map((transaction) => ({
					data: mapBtcTransaction({ transaction, btcAddress, latestBitcoinBlockHeight }),
					certified: false
				}))
			: [];

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
}
