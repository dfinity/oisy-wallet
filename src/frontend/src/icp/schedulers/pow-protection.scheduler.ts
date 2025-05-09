import type { CreateChallengeResponse } from '$declarations/backend/backend.did';
import { POW_CHALLENGE_INTERVAL_MILLIS } from '$env/pow.env';
import { solvePowChallenge } from '$icp/services/pow-protector.services';
import { allowSigning, createPowChallenge } from '$lib/api/backend.api';
import { CanisterInternalError } from '$lib/canisters/errors';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { PostMessageDataRequest } from '$lib/types/post-message';

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
	 * @throws Errors if any step in the sequence fails.
	 */
	private requestSignerCycles = async ({ identity }: SchedulerJobData<PostMessageDataRequest>) => {
		let createChallengeResponse: CreateChallengeResponse | undefined;

		try {
			// Step 1: Request creation of the Proof-of-Work (PoW) challenge (throws when unsuccessful).
			createChallengeResponse = await createPowChallenge({
				identity
			});
		} catch (error) {
			// Exit only if this is a "Challenge already in progress" error
			if (this.isChallengeInProgressError(error)) {
				return;
			}
		}

		// Make sure we have a valid response before continuing
		if (!createChallengeResponse) {
			return;
		}

		// Step 2: Solve the PoW challenge.
		const nonce = await solvePowChallenge({
			timestamp: createChallengeResponse.start_timestamp_ms,
			difficulty: createChallengeResponse.difficulty
		});

		// Step 3: Request allowance for signing operations with solved nonce.
		await allowSigning({
			identity,
			request: { nonce }
		});
	};

	// Helper function to check for the specific error condition
	private isChallengeInProgressError = (error: unknown): boolean =>
		error instanceof CanisterInternalError && error.message === 'Challenge is already in progress';
}
