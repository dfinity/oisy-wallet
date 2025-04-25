import type { CreateChallengeResponse } from '$declarations/backend/backend.did';
import { POW_CHALLENGE_INTERVAL_MILLIS } from '$env/pow.env';
import { solvePowChallenge } from '$icp/services/pow-protector.services';
import { allowSigning, createPowChallenge } from '$lib/api/backend.api';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';

export class PowProtectionScheduler<PostMessageDataRequest>
	implements Scheduler<PostMessageDataRequest>
{
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
		// Step 1: Request creation of the Proof-of-Work (PoW) challenge (throws when unsuccessful).
		const { start_timestamp_ms: timestamp, difficulty }: CreateChallengeResponse =
			await createPowChallenge({ identity });

		// Step 2: Solve the PoW challenge.
		const nonce = await solvePowChallenge({
			timestamp,
			difficulty
		});

		// Step 3: Request allowance for signing operations with solved nonce.
		await allowSigning({
			identity,
			request: { nonce }
		});
	};
}
