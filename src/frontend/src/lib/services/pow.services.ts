import type {
	AllowSigningRequest,
	Result_2 as AllowSigningResult,
	Result_6 as CreateChallengeResult
} from '$declarations/backend/backend.did';
import { allowSigningResult, createPowChallenge } from '$lib/api/backend.api';
import type { OptionIdentity } from '$lib/types/identity';
import { hashToHex } from '$lib/utils/crypto.utils';

function getTimestampNowMs(): bigint {
	return BigInt(Date.now());
}

export const solvePowChallenge = async ({
																					timestamp,
																					difficulty
																				}: {
	timestamp: bigint;
	difficulty: number;
}): Promise<number> => {
	if (difficulty <= 0) {
		throw new Error('Difficulty must be greater than zero');
	}

	let nonce = 0;
	const target = Math.floor(0xffffffff / difficulty);

	// is only used to measure the effective execution time
	const startTimestampMs = getTimestampNowMs();

	while (true) {
		const challengeStr = `${timestamp}.${nonce}`;
		const hashHex = await hashToHex(challengeStr); // Using the new hashToHex function
		const prefix = parseInt(hashHex.slice(0, 8), 16); // Only consider the first 4 bytes
		if (prefix <= target) {
			break;
		}
		nonce++;
	}

	const solveTimestampMs = getTimestampNowMs() - startTimestampMs;
	console.error(`Pow Challenge solved in ${Number(solveTimestampMs) / 1e3} seconds.`);
	return nonce;
};

export const _createPowChallenge = async ({
																						identity
																					}: {
	identity: OptionIdentity;
}): Promise<CreateChallengeResult> => {
	try {
		return await createPowChallenge({ identity });
	} catch (error) {
		return {
			Err: {
				Other: `UnexpectedError: ${error}`
			}
		};
	}
};

export const _allowSigning = async ({
																			identity,
																			request
																		}: {
	identity: OptionIdentity;
	request?: AllowSigningRequest;
}): Promise<AllowSigningResult> => {
	try {
		return await allowSigningResult({ identity, request });
	} catch (error) {
		// Ensure the `Err` matches the `CreateChallengeError` type
		return {
			Err: {
				Other: `UnexpectedError: ${error}`
			}
		};
	}
};
