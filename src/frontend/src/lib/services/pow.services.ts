import type {
	AllowSigningRequest,
	AllowSigningResponse,
	CreateChallengeResponse,
	Result_6
} from '$declarations/backend/backend.did';

import { allowSigning, createPowChallenge } from '$lib/api/backend.api';
import { mapAllowSigningError, mapCreateChallengeError } from '$lib/canisters/backend.errors';
import type { OptionIdentity } from '$lib/types/identity';
import { hashToHex } from '$lib/utils/crypto.utils';

function getTimestampNowNs(): bigint {
	return BigInt(Date.now()) * BigInt(1e6);
}

export const solvePowChallenge = async (timestamp: bigint, difficulty: number): Promise<number> => {
	if (difficulty <= 0) throw new Error('Difficulty must be greater than zero');

	let nonce = 0;
	const target = Math.floor(0xffffffff / difficulty);
	const startTimestamp = getTimestampNowNs();

	while (true) {
		const challengeStr = `${timestamp}.${nonce}`;
		const hashHex = await hashToHex(challengeStr); // Using the new hashToHex function
		const prefix = parseInt(hashHex.slice(0, 8), 16); // Only consider the first 4 bytes
		if (prefix <= target) break;
		nonce++;
	}

	const solveTimestampNs = getTimestampNowNs() - startTimestamp;
	console.error(`Pow Challenge solved in ${Number(solveTimestampNs) / 1e9} seconds.`);
	return nonce;
};

export const _createPowChallenge = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<CreateChallengeResponse> => {
	const response: Result_6 = await createPowChallenge({
		identity
	});

	if ('Err' in response) {
		throw mapCreateChallengeError(response.Err);
	}
	return response.Ok;
};

export const _allowSigning = async ({
	identity,
	request
}: {
	identity: OptionIdentity;
	request?: AllowSigningRequest;
}): Promise<AllowSigningResponse> => {
	const response = await allowSigning({ identity, request });

	if ('Err' in response) {
		throw mapAllowSigningError(response.Err);
	}

	return response.Ok;
};
