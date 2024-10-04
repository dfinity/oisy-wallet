import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import type { BitcoinNetwork } from '$declarations/signer/signer.did';
import { getBtcBalance } from '$lib/api/signer.api';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { btcAddressData } from '$lib/rest/blockchain.rest';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { BtcAddress } from '$lib/types/address';
import type { BitcoinTransaction } from '$lib/types/blockchain';
import type { OptionIdentity } from '$lib/types/identity';
import type {
	PostMessageDataRequestBtc,
	PostMessageDataResponseWallet
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { assertNonNullish, isNullish, jsonReplacer } from '@dfinity/utils';

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

	private async loadBtcTransactions({
		btcAddress
	}: {
		btcAddress: BtcAddress;
	}): Promise<BitcoinTransaction[]> {
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

		return newTransactions;
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
			network: bitcoinNetwork
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

		const btcAddress = data?.btcAddress;
		assertNonNullish(btcAddress, 'No BTC address provided to get BTC transactions.');

		const balance = await this.loadBtcBalance({ identity, bitcoinNetwork });
		const newTransactions = data?.shouldFetchTransactions
			? await this.loadBtcTransactions({ btcAddress })
			: [];

		const uncertifiedTransactions = newTransactions.map((transaction) => ({
			data: mapBtcTransaction({ transaction, btcAddress }),
			certified: false
		}));

		this.postMessageWallet({
			wallet: {
				balance,
				newTransactions: JSON.stringify(uncertifiedTransactions, jsonReplacer)
			}
		});
	};

	private postMessageWallet(data: PostMessageDataResponseWallet) {
		this.timer.postMsg<PostMessageDataResponseWallet>({
			msg: 'syncBtcWallet',
			data
		});
	}
}
