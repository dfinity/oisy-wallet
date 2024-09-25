import { getBtcBalance } from '$lib/api/signer.api';
import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type {
	PostMessageDataRequestBtc,
	PostMessageDataResponseBtcWallet
} from '$lib/types/post-message';
import { assertNonNullish } from '@dfinity/utils';

export class BtcWalletScheduler implements Scheduler<PostMessageDataRequestBtc> {
	private timer = new SchedulerTimer('syncBtcWalletStatus');

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

		this.postMessageWallet({
			wallet: {
				balance: {
					data: balance,
					certified: true
				}
			}
		});
	};

	private postMessageWallet(data: PostMessageDataResponseBtcWallet) {
		this.timer.postMsg<PostMessageDataResponseBtcWallet>({
			msg: 'syncBtcWallet',
			data
		});
	}
}
