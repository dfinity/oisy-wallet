import type { AllowSigningResponse, CreateChallengeResponse } from '$declarations/backend/backend.did';
import { allowSigning, createPowChallenge } from '$lib/api/backend.api';
import { POW_CHALLENGE_INTERVALL_MILLIS } from '$lib/constants/pow.constants';
import { type Scheduler, type SchedulerJobData, SchedulerTimer } from '$lib/schedulers/scheduler';
import { solvePowChallenge } from '$lib/services/pow.services';
import type { PostMessageDataRequest } from '$lib/types/post-message';

export class PowProtectionScheduler implements Scheduler<PostMessageDataRequest> {
	private timer = new SchedulerTimer('syncPowProtectionStatus');

	private btcAddress: string | undefined;

	stop() {
		this.timer.stop();
	}

	async start(data: PostMessageDataRequest | undefined) {
		await this.timer.start<PostMessageDataRequest>({
			interval: POW_CHALLENGE_INTERVALL_MILLIS,
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
	 * Initiates Proof-of-Work and signing processes sequentially.
	 * This function coordinates:
	 * 1. Creation of a PoW challenge.
	 * 2. Solving the PoW challenge.
	 * 3. Requesting allowance for signing using the solved nonce.
	 *
	 * Errors at any stage lead to early returns with appropriate logging.
	 */
	private requestSignerCycles = async ({ identity }: SchedulerJobData<PostMessageDataRequest>) => {
		// Step 1: Requests creation of the Proof-of-Work (PoW) challenge and throws when unsuccessful.
		const response: CreateChallengeResponse = await createPowChallenge({ identity });

		// Step 2: Requests allowance for signing operations with solved nonce.
		const nonce = await solvePowChallenge({
			timestamp: response.start_timestamp_ms,
			difficulty: response.difficulty
		});

		// Step 3: Requests allowance for signing operations with solved nonce.
		const allow_signing: AllowSigningResponse = await allowSigning({
			identity,
			nonce
		});

		console.log('_allow_signing:', allow_signing);
	};
}
