import type {
	AllowSigningRequest,
	AllowSigningResponse,
	CreateChallengeResponse,
	Result_6
} from '$declarations/backend/backend.did';

import { allowSigningApi, createPowChallengeApi } from '$lib/api/backend.api';
import { mapAllowSigningError, mapCreateChallengeError } from '$lib/canisters/backend.errors';
import type { OptionIdentity } from '$lib/types/identity';
import crypto from 'crypto';

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
		const hash = crypto.createHash('sha256').update(challengeStr).digest();
		const prefix = hash.readUInt32BE(0);
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
	const response: Result_6 = await createPowChallengeApi({
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
	const response = await allowSigningApi({ identity });

	if ('Err' in response) {
		throw mapAllowSigningError(response.Err);
	}

	return response.Ok;
};
