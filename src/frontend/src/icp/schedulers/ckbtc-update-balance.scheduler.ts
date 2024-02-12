import { updateBalance } from '$icp/api/ckbtc-minter.api';
import { CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS } from '$icp/constants/ckbtc.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$icp/schedulers/scheduler';
import type {
	PostMessageDataRequestCkBTC,
	PostMessageJsonDataResponseCkBTC
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { MinterNoNewUtxosError, type PendingUtxo } from '@dfinity/ckbtc';
import { assertNonNullish, jsonReplacer } from '@dfinity/utils';

export class CkBTCUpdateBalanceScheduler implements Scheduler<PostMessageDataRequestCkBTC> {
	private timer = new SchedulerTimer('syncCkBtcUpdateBalanceStatus');

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestCkBTC | undefined) {
		await this.timer.start<PostMessageDataRequestCkBTC>({
			interval: CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS,
			job: this.updateBalance,
			data
		});
	}

	async trigger(data: PostMessageDataRequestCkBTC | undefined) {
		await this.timer.trigger<PostMessageDataRequestCkBTC>({
			job: this.updateBalance,
			data
		});
	}

	private updateBalance = async ({
		identity,
		data
	}: SchedulerJobData<PostMessageDataRequestCkBTC>) => {
		const minterCanisterId = data?.minterCanisterId;

		assertNonNullish(
			minterCanisterId,
			'No data - minterCanisterId - provided to update the BTC balance.'
		);

		try {
			await updateBalance({
				identity,
				minterCanisterId
			});

			this.timer.postMsg<never>({
				msg: 'syncCkBtcUpdateOk'
			});
		} catch (err: unknown) {
			if (err instanceof MinterNoNewUtxosError) {
				this.postUtxos(err);
				return;
			}

			// We only log and continue to poll on purpose. UpdateBalance can fail for various reasons.
			console.error(err);
		}
	};

	private postUtxos(err: MinterNoNewUtxosError) {
		const { pendingUtxos } = err;

		const data: CertifiedData<PendingUtxo[]> = {
			certified: true,
			data: pendingUtxos
		};

		this.timer.postMsg<PostMessageJsonDataResponseCkBTC>({
			msg: 'syncBtcPendingUtxos',
			data: {
				json: JSON.stringify(data, jsonReplacer)
			}
		});
	}
}
