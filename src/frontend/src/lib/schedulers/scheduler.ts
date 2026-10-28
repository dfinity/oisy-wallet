import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import type {
	PostMessageDataResponseLoose,
	PostMessageResponseStatus,
	PostMessageScheduler
} from '$lib/types/post-message';
import type { SyncState } from '$lib/types/sync';
import { consoleError } from '$lib/utils/console.utils';
import { isNullish, nonNullish, type QueryParams } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

export interface SchedulerParams<T> {
	job: (params: SchedulerJobData<T>) => Promise<void | boolean>;
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
	// Counts the stops, so that a start can tell whether it was stopped while it awaited the identity.
	private stops = 0;
	private activeJob: Promise<boolean> | undefined;

	constructor(private statusMsg: PostMessageResponseStatus) {}

	private static readonly IDENTITY_MAX_RETRIES = 3;
	private static readonly IDENTITY_RETRY_DELAY_MS = 1_000;

	/**
	 * Attempts to load the authenticated identity from IndexedDB with retries.
	 *
	 * On cold starts — especially on mobile devices — the worker can fire before
	 * IndexedDB has finished persisting the identity written by the main thread.
	 * A single `loadIdentity()` call may return `undefined` in that narrow window,
	 * silently preventing the scheduler from ever starting.
	 * Retrying with a short delay gives IDB enough time to settle.
	 */
	private async loadIdentityWithRetry(): Promise<Identity | undefined> {
		for (let attempt = 0; attempt <= SchedulerTimer.IDENTITY_MAX_RETRIES; attempt++) {
			const identity = await AuthClientProvider.getInstance().loadIdentity();

			if (nonNullish(identity)) {
				return identity;
			}

			if (attempt < SchedulerTimer.IDENTITY_MAX_RETRIES) {
				await new Promise<void>((resolve) =>
					setTimeout(resolve, SchedulerTimer.IDENTITY_RETRY_DELAY_MS)
				);
			}
		}

		return undefined;
	}

	async start<T>({
		interval,
		...rest
	}: SchedulerParams<T> & { interval: number | 'disabled' }): Promise<void> {
		// This worker scheduler has already been started
		if (nonNullish(this.timer)) {
			return;
		}

		const stopsBefore = this.stops;

		const identity = await this.loadIdentityWithRetry();

		// A worker handles its messages without awaiting one another, so a stop can arrive while this
		// start awaits the identity. Starting the timer anyway would leave one that no stop can reach.
		if (this.stops !== stopsBefore) {
			return;
		}

		if (isNullish(identity)) {
			// We do nothing if no identity
			consoleError('Attempted to initiate a worker without an authenticated identity.');
			return;
		}

		const execute = async () => await this.executeJob<T>({ identity, ...rest });

		// We sync the cycles now but also schedule the update after wards
		// We don't wait for the execution to finish before scheduling the next one, because, in case of error, there could be a race condition in case the UI submit a re-start of the worker.
		// For example, awaiting the current promise might take longer than receiving a new message from the UI requesting to stop the interval—which hasn’t been initialized yet, as it only starts after the promise resolves.
		// We observed this behavior empirically while debugging a live test instance deployed on the Internet Computer.
		// TODO: If this doesn't really fix it, another solution is to loop the function that stops the timer, so that it will run until it is triggered at least once (or until a max number of attempts).
		execute();

		// Support for features that implement the exact same pattern of a repetitive task but, are currently not scheduled for being refreshed automatically.
		if (interval === 'disabled') {
			return;
		}

		const scheduleNext = (): void => {
			this.timer = setTimeout(async () => {
				const isTimer = nonNullish(this.timer);

				await execute();

				if (isTimer) {
					scheduleNext();
				}
			}, interval);
		};

		scheduleNext();
	}

	// trigger() is called for on-demand user-initiated actions, not during cold start,
	// so the identity is expected to be available without retries.
	async trigger<T>(params: SchedulerParams<T>) {
		const identity = await AuthClientProvider.getInstance().loadIdentity();

		if (isNullish(identity)) {
			// We cannot execute without an identity
			consoleError('Attempted to execute a worker without an authenticated identity.');
			return;
		}

		await this.executeJob<T>({ identity, ...params });
	}

	// Manual refresh joins scheduled work and propagates failure without changing
	// how background trigger callers handle errors.
	async refresh<T>(params: SchedulerParams<T>): Promise<void> {
		const generation = this.stops;
		let running = this.activeJob;
		if (!running) {
			const identity = await AuthClientProvider.getInstance().loadIdentity();
			if (isNullish(identity) || generation !== this.stops) {
				throw new Error('Wallet unavailable');
			}
			running = this.activeJob ?? this.executeJob({ identity, ...params });
		}
		const success = await running;
		if (!success || generation !== this.stops) {
			throw new Error('Wallet refresh failed');
		}
	}

	private async executeJob<T>({
		job,
		...rest
	}: SchedulerParams<T> & SchedulerSyncParams): Promise<boolean> {
		if (this.timerStatus !== 'idle') {
			return false;
		}
		this.setStatus('in_progress');
		const generation = this.stops;
		const running = (async () => {
			try {
				const success = await job({ ...rest });
				if (generation !== this.stops) {
					return false;
				}
				this.setStatus('idle');
				return success !== false;
			} catch (err: unknown) {
				consoleError(err);
				if (generation !== this.stops) {
					return false;
				}
				this.setStatus('error');
				this.stop();
				return false;
			}
		})();
		this.activeJob = running;
		const success = await running;
		if (this.activeJob === running) {
			this.activeJob = undefined;
		}
		return success;
	}

	stop() {
		this.stops++;
		// A refresh after restart must not join a job from the previous generation.
		this.activeJob = undefined;
		this.stopTimer();
		this.setStatus('idle');
	}

	postMsg<T extends PostMessageDataResponseLoose>(data: PostMessageScheduler<T>) {
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

		clearTimeout(this.timer);
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
