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
export const solvePowChallenge = async ({
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
		const hashHex = await hashToHex(challengeStr);

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
