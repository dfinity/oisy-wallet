import { updateBalance } from '$icp/api/ckbtc-minter.api';
import { CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS } from '$icp/constants/ckbtc.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$icp/schedulers/scheduler';
import type {
	PostMessageDataRequestCkBTCWallet,
	PostMessageDataResponseBtcPendingUtxos
} from '$lib/types/post-message';
import type { CertifiedData } from '$lib/types/store';
import { MinterNoNewUtxosError, type PendingUtxo } from '@dfinity/ckbtc';
import { assertNonNullish, jsonReplacer } from '@dfinity/utils';

export class CkbtcUpdateBalanceScheduler implements Scheduler<PostMessageDataRequestCkBTCWallet> {
	private timer = new SchedulerTimer();

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequestCkBTCWallet | undefined) {
		await this.timer.start<PostMessageDataRequestCkBTCWallet>({
			interval: CKBTC_UPDATE_BALANCE_TIMER_INTERVAL_MILLIS,
			job: this.updateBalance,
			data
		});
	}

	async trigger(data: PostMessageDataRequestCkBTCWallet | undefined) {
		await this.timer.trigger<PostMessageDataRequestCkBTCWallet>({
			job: this.updateBalance,
			data
		});
	}

	private updateBalance = async ({
		identity,
		data
	}: SchedulerJobData<PostMessageDataRequestCkBTCWallet>) => {
		const minterCanisterId = data?.minterCanisterId;

		assertNonNullish(
			minterCanisterId,
			'No data - minterCanisterId - provided to fetch the BTC withdrawal statuses.'
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

		this.timer.postMsg<PostMessageDataResponseBtcPendingUtxos>({
			msg: 'syncBtcPendingUtxos',
			data: {
				pendingUtxos: JSON.stringify(data, jsonReplacer)
			}
		});
	}
}
