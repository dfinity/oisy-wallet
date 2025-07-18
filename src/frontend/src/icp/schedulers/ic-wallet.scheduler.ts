import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type {
	PostMessageDataResponseError,
	PostMessageDataResponseWallet
} from '$lib/types/post-message';

export type IcWalletMsg = 'syncIcpWallet' | 'syncIcrcWallet' | 'syncDip20Wallet';

export abstract class IcWalletScheduler<PostMessageDataRequest>
	implements Scheduler<PostMessageDataRequest>
{
	protected timer = new SchedulerTimer('syncIcWalletStatus');

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequest | undefined) {
		await this.timer.start<PostMessageDataRequest>({
			interval: WALLET_TIMER_INTERVAL_MILLIS,
			job: this.syncWallet,
			data
		});
	}

	async trigger(data: PostMessageDataRequest | undefined) {
		await this.timer.trigger<PostMessageDataRequest>({
			job: this.syncWallet,
			data
		});
	}

	protected abstract syncWallet({
		identity,
		...data
	}: SchedulerJobData<PostMessageDataRequest>): Promise<void>;

	protected postMessageWallet({
		data,
		msg
	}: {
		data: PostMessageDataResponseWallet;
		msg: IcWalletMsg;
	}) {
		this.timer.postMsg<PostMessageDataResponseWallet>({
			msg,
			data
		});
	}

	protected postMessageWalletError({ error, msg }: { error: unknown; msg: IcWalletMsg }) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: `${msg}Error`,
			data: {
				error
			}
		});
	}
}
