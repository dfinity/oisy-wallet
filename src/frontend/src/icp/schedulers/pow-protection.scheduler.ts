import type { CreateChallengeResponse } from '$declarations/backend/backend.did';
import { solvePowChallenge } from '$icp/services/pow-protector.services';
import { allowSigning, createPowChallenge } from '$lib/api/backend.api';
import {
	ChallengeCompletionErrorEnum,
	CreateChallengeEnum,
	PowChallengeError
} from '$lib/canisters/backend.errors';
import { POW_CHALLENGE_INTERVAL_MILLIS } from '$lib/constants/pow.constants';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type {
	PostMessageDataRequest,
	PostMessageDataResponsePowProtectorNextAllowance,
	PostMessageDataResponsePowProtectorProgress
} from '$lib/types/post-message';

export class PowProtectionScheduler implements Scheduler<PostMessageDataRequest> {
	private timer = new SchedulerTimer('syncPowProtectionStatus');

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequest | undefined) {
		await this.timer.start<PostMessageDataRequest>({
			interval: POW_CHALLENGE_INTERVAL_MILLIS,
			job: this.requestSignerCycles,
			data
		});
	}

	async trigger(data: PostMessageDataRequest | undefined) {
		await this.timer.trigger<PostMessageDataRequest>({
			job: this.requestSignerCycles,
			data
		});
	}

	/**
	 * Initiates the Proof-of-Work (PoW) and signing request cycles.
	 *
	 * This method:
	 * 1. Creates a PoW challenge using the given identity.
	 * 2. Solves the challenge to find a valid `nonce`.
	 * 3. Uses the solved `nonce` to request signing permission.
	 *
	 * @param identity - The user's identity for the operation.
	 * @throws Errors if any step with no specific error handling in the sequence fails.
	 */
	private requestSignerCycles = async ({ identity }: SchedulerJobData<PostMessageDataRequest>) => {
		let createChallengeResponse: CreateChallengeResponse | undefined;
		// Step 1: Request creation of the Proof-of-Work (PoW) challenge (throws when unsuccessful).
		this.postMessagePowProgress({ progress: 'REQUEST_CHALLENGE' });
		try {
			createChallengeResponse = await createPowChallenge({
				identity
			});
		} catch (err: unknown) {
			// We can skip the "Challenge already in progress" since we are already in the middle of a challenge. This
			// usually happens when:
			// 1.) The backend setting EXPIRY_DURATION_MS exceeds the frontend setting POW_CHALLENGE_INTERVAL_MILLIS
			// 2.) The frontend is opened in more tabs/windows (leading to multiple competing schedulers)
			if (this.isChallengeInProgressError(err)) {
				return;
			}
		}

		// Make sure we have a valid response before continuing
		if (!createChallengeResponse) {
			return;
		}

		// Step 2: Solve the PoW challenge.
		this.postMessagePowProgress({ progress: 'SOLVE_CHALLENGE' });
		const nonce = await solvePowChallenge({
			timestamp: createChallengeResponse.start_timestamp_ms,
			difficulty: createChallengeResponse.difficulty
		});

		// Step 3: Request allowance for signing operations with solved nonce.
		this.postMessagePowProgress({
			progress: 'GRANT_CYCLES'
			//	nextAllowanceMs: allowSigningResponse?.challenge_completion[0]?.next_allowance_ms
		});
		let allowSigningResponse;
		try {
			allowSigningResponse = await allowSigning({
				identity,
				request: { nonce }
			});
		} catch (err: unknown) {
			// Handle expired challenge specifically
			if (this.isExpiredChallengeError(err)) {
				console.error(
					'ExpiredChallenge: The challange was not solved within the given timeframe. Reduce the ' +
						'difficulty or increase the expiary duration to avoid this issue from happening again'
				);
			}
		}
		if (allowSigningResponse?.challenge_completion[0]?.next_allowance_ms !== undefined) {
			this.postMessagePowNextAllowance({
				nextAllowanceMs: allowSigningResponse.challenge_completion[0].next_allowance_ms
			});
		}
	};

	private isChallengeInProgressError = (error: unknown): boolean =>
		error instanceof PowChallengeError &&
		error.message.includes(CreateChallengeEnum.ChallengeInProgress);

	private isExpiredChallengeError = (error: unknown): boolean =>
		error instanceof PowChallengeError &&
		error.message.includes(ChallengeCompletionErrorEnum.ExpiredChallenge);

	private postMessagePowProgress({
		progress
	}: {
		progress: 'REQUEST_CHALLENGE' | 'SOLVE_CHALLENGE' | 'GRANT_CYCLES';
	}) {
		const data: PostMessageDataResponsePowProtectorProgress = {
			progress
		};

		this.timer.postMsg<PostMessageDataResponsePowProtectorProgress>({
			msg: 'syncPowProgress',
			data
		});
	}

	private postMessagePowNextAllowance({ nextAllowanceMs }: { nextAllowanceMs: bigint }) {
		const data: PostMessageDataResponsePowProtectorNextAllowance = {
			nextAllowanceMs
		};

		this.timer.postMsg<PostMessageDataResponsePowProtectorNextAllowance>({
			msg: 'syncPowNextAllowance',
			data
		});
	}
}
