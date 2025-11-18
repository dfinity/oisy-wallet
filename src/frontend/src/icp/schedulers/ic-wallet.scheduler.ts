import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type {
	PostMessageCommon,
	PostMessageDataRequestDip20,
	PostMessageDataRequestIcp,
	PostMessageDataRequestIcrc,
	PostMessageDataResponseError,
	PostMessageDataResponseWallet
} from '$lib/types/post-message';
import { isNullish } from '@dfinity/utils';

export type IcWalletMsg = 'syncIcpWallet' | 'syncIcrcWallet' | 'syncDip20Wallet';

export abstract class IcWalletScheduler<
	PostMessageDataRequest extends
		| PostMessageDataRequestIcrc
		| PostMessageDataRequestIcp
		| PostMessageDataRequestDip20
> implements Scheduler<PostMessageDataRequest>
{
	protected ref: PostMessageCommon['ref'];

	protected timer = new SchedulerTimer('syncIcWalletStatus');

	stop() {
		this.timer.stop();
	}

	protected setRef(data: PostMessageDataRequest | undefined) {
		this.ref = isNullish(data)
			? undefined
			: 'ledgerCanisterId' in data
				? data.ledgerCanisterId
				: 'indexCanisterId' in data
					? data.indexCanisterId
					: data.canisterId;
	}

	async start(data: PostMessageDataRequest | undefined) {
		this.setRef(data);

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
		if (isNullish(this.ref)) {
			return;
		}

		this.timer.postMsg<PostMessageDataResponseWallet>({
			ref: this.ref,
			msg,
			data
		});
	}

	protected postMessageWalletError({ error, msg }: { error: unknown; msg: IcWalletMsg }) {
		if (isNullish(this.ref)) {
			return;
		}

		this.timer.postMsg<PostMessageDataResponseError>({
			ref: this.ref,
			msg: `${msg}Error`,
			data: {
				error
			}
		});
	}
}
