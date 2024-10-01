import type { BitcoinNetwork } from '$declarations/signer/signer.did';
import { getBtcAddress, getBtcBalance } from '$lib/api/signer.api';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { btcAddressData } from '$lib/rest/blockchain.rest';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { OptionBtcAddress } from '$lib/types/address';
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
	btcAddress: OptionBtcAddress;
}

interface LoaderFunctionParams {
	identity: OptionIdentity;
	bitcoinNetwork: BitcoinNetwork;
}

export class BtcWalletScheduler implements Scheduler<PostMessageDataRequestBtc> {
	private timer = new SchedulerTimer('syncBtcWalletStatus');

	private store: BtcWalletStore = {
		balance: undefined,
		transactions: {},
		btcAddress: undefined
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

	private async loadBtcAddress({
		identity,
		bitcoinNetwork
	}: LoaderFunctionParams): Promise<string> {
		const btcAddress = await getBtcAddress({ identity, network: bitcoinNetwork });

		// Save address for next timer
		this.store = {
			...this.store,
			btcAddress
		};

		return btcAddress;
	}

	private async loadBtcTransactions({
		identity,
		bitcoinNetwork
	}: LoaderFunctionParams): Promise<BitcoinTransaction[]> {
		const btcAddress =
			this.store.btcAddress ?? (await this.loadBtcAddress({ identity, bitcoinNetwork }));

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
	}: LoaderFunctionParams): Promise<CertifiedData<bigint>> {
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
	 * 4. [Improvement] Receive btcAddress from FE as data param to avoid re-fetching it in a worker. Make sure it's certified.
	 * */
	private syncWallet = async ({ identity, data }: SchedulerJobData<PostMessageDataRequestBtc>) => {
		const bitcoinNetwork = data?.bitcoinNetwork;

		assertNonNullish(bitcoinNetwork, 'No BTC network provided to get certified balance.');

		const params = {
			identity,
			bitcoinNetwork
		};

		const balance = await this.loadBtcBalance(params);
		const newTransactions = data?.shouldFetchTransactions
			? await this.loadBtcTransactions(params)
			: [];

		this.postMessageWallet({
			wallet: {
				balance,
				// TODO: Parse transactions to BtcTransactionUi type
				newTransactions: JSON.stringify(newTransactions, jsonReplacer)
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
