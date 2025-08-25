import type { PostMessageResponse, PostMessageResponseStatus } from '$lib/types/post-message';
import type { SyncState } from '$lib/types/sync';
import { loadIdentity } from '$lib/utils/auth.utils';
import type { Identity } from '@dfinity/agent';
import { isNullish, nonNullish, type QueryParams } from '@dfinity/utils';

export interface SchedulerParams<T> {
	job: (params: SchedulerJobData<T>) => Promise<void>;
	data?: T;
}

export type SchedulerJobData<T> = {
	data?: T;
} & SchedulerSyncParams;

export type SchedulerJobParams<T> = SchedulerJobData<T> & Required<QueryParams>;

export interface SchedulerSyncParams {
	identity: Identity;
}

export interface Scheduler<T> {
	stop: () => void;
	start: (data: T | undefined) => Promise<void>;
	trigger: (data: T | undefined) => Promise<void>;
}

export class SchedulerTimer {
	private timer: NodeJS.Timeout | undefined = undefined;
	private timerStatus: SyncState = 'idle';

	constructor(private statusMsg: PostMessageResponseStatus) {}

	async start<T>({
		interval,
		...rest
	}: SchedulerParams<T> & { interval: number | 'disabled' }): Promise<void> {
		// This worker scheduler has already been started
		if (nonNullish(this.timer)) {
			return;
		}

		const identity: Identity | undefined = await loadIdentity();

		if (isNullish(identity)) {
			// We do nothing if no identity
			console.error('Attempted to initiate a worker without an authenticated identity.');
			return;
		}

		const execute = async () => await this.executeJob<T>({ identity, ...rest });

		// We sync the cycles now but also schedule the update after wards
		await execute();

		// Support for features that implement the exact same pattern of a repetitive task but, are currently not scheduled for being refreshed automatically.
		if (interval === 'disabled') {
			return;
		}

		this.timer = setInterval(execute, interval);
	}

	async trigger<T>(params: SchedulerParams<T>) {
		const identity: Identity | undefined = await loadIdentity();

		if (isNullish(identity)) {
			// We cannot execute without an identity
			console.error('Attempted to execute a worker without an authenticated identity.');
			return;
		}

		await this.executeJob<T>({ identity, ...params });
	}

	private async executeJob<T>({
		job,
		...rest
	}: SchedulerParams<T> & SchedulerSyncParams): Promise<void> {
		// Avoid to sync if already in progress - do not duplicate calls - or if there was a previous error
		if (this.timerStatus !== 'idle') {
			return;
		}

		this.setStatus('in_progress');

		try {
			await job({ ...rest });

			this.setStatus('idle');
		} catch (err: unknown) {
			console.error(err);

			// Once the status becomes "error", the job will no longer be called and the status will remain "error"
			this.setStatus('error');

			// Because it will no longer be called, we can stop it too
			this.stop();
		}
	}

	stop() {
		this.stopTimer();
		this.setStatus('idle');
	}

	postMsg<T>(data: { msg: PostMessageResponse; data?: T }) {
		if (this.isIdle()) {
			// The worker scheduler was stopped between the start of the execution and the actual completion of the job it runs.
			return;
		}

		postMessage(data);
	}

	private stopTimer() {
		if (isNullish(this.timer)) {
			return;
		}

		clearInterval(this.timer);
		this.timer = undefined;
	}

	private isIdle(): boolean {
		return this.timerStatus === 'idle';
	}

	private setStatus(state: SyncState) {
		this.timerStatus = state;

		postMessage({
			msg: this.statusMsg,
			data: {
				state
			}
		});
	}
}
