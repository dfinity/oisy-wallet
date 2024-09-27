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
import { assertNonNullish, jsonReplacer } from '@dfinity/utils';

export class BtcWalletScheduler implements Scheduler<PostMessageDataRequestBtc> {
	private timer = new SchedulerTimer('syncBtcWalletStatus');

	private btcAddress: OptionBtcAddress;

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
	}: {
		identity: OptionIdentity;
		bitcoinNetwork: BitcoinNetwork;
	}): Promise<string> {
		// Save address for next timer
		this.btcAddress = await getBtcAddress({ identity, network: bitcoinNetwork });

		return this.btcAddress;
	}

	/* TODO: The following steps need to be done:
	 * 1. Fetch uncertified transactions via BTC transaction API.
	 * 2. Query uncertified balance in oder to improve UX (signer.getBtcBalance takes ~5s to complete).
	 * 3. Fetch certified transactions via BE endpoint (to be discussed).
	 * */
	private syncWallet = async ({ identity, data }: SchedulerJobData<PostMessageDataRequestBtc>) => {
		const bitcoinNetwork = data?.bitcoinNetwork;

		assertNonNullish(bitcoinNetwork, 'No BTC network provided to get certified balance.');

		const balance = await getBtcBalance({
			identity,
			network: bitcoinNetwork
		});

		let uncertifiedTransactions: CertifiedData<BitcoinTransaction>[] = [];

		if (data?.shouldFetchTransactions) {
			const btcAddress =
				data?.btcAddress ??
				this.btcAddress ??
				(await this.loadBtcAddress({ identity, bitcoinNetwork }));

			const transactions = (await btcAddressData({ btcAddress })).txs;

			uncertifiedTransactions = transactions.map((transaction) => ({
				// TODO: Parse transactions to BtcTransactionUi type
				data: transaction,
				certified: false
			}));
		}

		this.postMessageWallet({
			wallet: {
				balance: {
					data: balance,
					certified: true
				},
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
