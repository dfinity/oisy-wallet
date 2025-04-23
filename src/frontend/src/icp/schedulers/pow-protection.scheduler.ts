import type {
	AllowSigningResponse,
	CreateChallengeResponse
} from '$declarations/backend/backend.did';
import { POW_CHALLENGE_INTERVAL_MILLIS } from '$env/pow.env';
import { allowSigning, createPowChallenge } from '$lib/api/backend.api';
import { SchedulerTimer, type Scheduler, type SchedulerJobData } from '$lib/schedulers/scheduler';
import type { PostMessageDataRequest } from '$lib/types/post-message';
import { hashText } from '@dfinity/utils';

export class PowProtectionScheduler implements Scheduler<PostMessageDataRequest> {
	private timer = new SchedulerTimer('syncPowProtectionStatus');

	private btcAddress: string | undefined;

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
	 * Solves a Proof-of-Work (PoW) challenge by finding a `nonce` that satisfies the given difficulty level.
	 *
	 * The PoW challenge involves concatenating a `timestamp` with a `nonce` and hashing the resulting string.
	 * The goal is to find a `nonce` such that the first 4 bytes of the hash, when interpreted as an integer, are
	 * less or equal to the calculated `target`. based on the difficulty level.
	 *
	 * For a better understanding the difficulty level influences the challenge:
	 * - Higher difficulty ⇒ smaller target ⇒ harder challenge (fewer valid hashes).
	 * - Lower difficulty ⇒ larger target ⇒ easier challenge (more valid hashes).
	 */
	private solvePowChallenge = async ({
		timestamp,
		difficulty
	}: {
		timestamp: bigint; // The unique timestamp for the challenge
		difficulty: number; // The difficulty level
	}): Promise<bigint> => {
		if (difficulty <= 0) {
			throw new Error('Difficulty must be greater than zero');
		}

		// This is the value we need to find to solve the challenge (changed to bigint)
		let nonce = 0n;

		// Target is proportional to 1/difficulty (converted target to bigint)
		const target = BigInt(Math.floor(0xffffffff / difficulty));

		// Continuously try different nonce values until the challenge is solved
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
		const nonce = await this.solvePowChallenge({
			timestamp: response.start_timestamp_ms,
			difficulty: response.difficulty
		});

		// Step 3: Requests allowance for signing operations with solved nonce.
		const _allow_signing: AllowSigningResponse = await allowSigning({
			identity,
			request: { nonce }
		});

		// console.log('_allow_signing:', _allow_signing);
	};
}
