import { USER_SNAPSHOT_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';
import { SchedulerTimer, type Scheduler } from '$lib/schedulers/scheduler';
import { registerUserSnapshot } from '$lib/services/user-snapshot.services';
import type {
	PostMessageDataRequestBtc,
	PostMessageDataResponseError
} from '$lib/types/post-message';

export class UserSnapshotScheduler implements Scheduler<PostMessageDataRequestBtc> {
	private timer = new SchedulerTimer('syncUserSnapshotStatus');

	stop() {
		this.timer.stop();
	}

	async start() {
		await this.timer.start({
			interval: USER_SNAPSHOT_TIMER_INTERVAL_MILLIS,
			job: this.syncUserSnapshot
		});
	}

	async trigger() {
		await this.timer.trigger({
			job: this.syncUserSnapshot
		});
	}

	private syncUserSnapshot = async () => {
		try {
			await registerUserSnapshot();
		} catch (error: unknown) {
			console.error('Unexpected error while taking user snapshot:', error);

			this.postMessageWalletError({ error });
		}
	};

	protected postMessageWalletError({ error }: { error: unknown }) {
		this.timer.postMsg<PostMessageDataResponseError>({
			msg: 'syncUserSnapshotError',
			data: {
				error
			}
		});
	}
}
