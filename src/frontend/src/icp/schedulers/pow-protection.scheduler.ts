import type { CreateChallengeResponse } from '$declarations/backend/backend.did';
import { POW_CHALLENGE_INTERVAL_MILLIS } from '$env/pow.env';
import { allowSigning, createPowChallenge } from '$lib/api/backend.api';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { PostMessageDataRequest } from '$lib/types/post-message';
import { hashText } from '@dfinity/utils';

// TODO: add tests for POW worker/scheduler
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
	 * Solves a Proof-of-Work (PoW) challenge by finding a `nonce` that satisfies the given difficulty level
	 *
	 * @param timestamp - A unique `bigint` value for the challenge.
	 * @param difficulty - A positive number influencing the challenge's complexity.
	 * @returns The `nonce` that solves the challenge as a `bigint`.
	 * @throws An error if `difficulty` is not greater than zero.
	 */
	private solvePowChallenge = async ({
		timestamp,
		difficulty
	}: {
		timestamp: bigint;
		difficulty: number;
	}): Promise<bigint> => {
		if (difficulty <= 0) {
			throw new Error('Difficulty must be greater than zero');
		}

		// This is the value we need to find to solve the challenge (changed to bigint)
		let nonce = 0n;

		// Target is proportional to 1/difficulty (converted target to bigint)
		const target = BigInt(Math.floor(0xffffffff / difficulty));

		// Continuously try different nonce values until the challenge is solved
		// TODO: Check if it is worth introducing a max number of iterations
		while (true) {
			// Concatenate the timestamp and nonce as the challenge string
			const challengeStr = `${timestamp}.${nonce}`;

			// Hash the string into a hex representation
			const hashHex = await hashText(challengeStr);

			// Extract the first 4 bytes of the hash as a number (prefix converted to bigint)
			const prefix = BigInt(parseInt(hashHex.slice(0, 8), 16));

			// If the prefix satisfies the difficulty target, stop the loop
			if (prefix <= target) {
				break;
			}

			// Otherwise, increment the nonce (bigint increment) and try again
			nonce++;
		}

		// Return the nonce that solves the challenge (bigint type)
		return nonce;
	};

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
		const nonce = await this.solvePowChallenge({
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
