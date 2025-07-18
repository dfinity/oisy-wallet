import { hashText } from '@dfinity/utils';

/**
 * Solves a Proof-of-Work (PoW) challenge by finding a `nonce` that satisfies the given difficulty level
 *
 * @param timestamp - A unique `bigint` value for the challenge.
 * @param difficulty - A positive number influencing the challenge's complexity.
 * @returns The `nonce` that solves the challenge as a `bigint`.
 * @throws An error if `difficulty` is not greater than zero.
 */
export const solvePowChallenge = async ({
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

	let prefix: bigint;

	// Continuously try different nonce values until the challenge is solved
	do {
		// Concatenate the timestamp and nonce as the challenge string
		const challengeStr = `${timestamp}.${nonce}`;

		// Hash the string into a hex representation
		const hashHex = await hashText(challengeStr);

		// Extract the first 4 bytes of the hash as a number (prefix converted to bigint)
		prefix = BigInt(parseInt(hashHex.slice(0, 8), 16));

		// Increment the nonce if the condition is not satisfied
		if (prefix > target) {
			nonce++;
		}
	} while (prefix > target);

	// Return the nonce that solves the challenge (bigint type)
	return nonce;
};
