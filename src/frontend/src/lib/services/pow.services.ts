import type {
	CreateChallengeResponse,
	Result_6 as CreateChallengeResult
} from '$declarations/backend/backend.did';
import { createPowChallenge } from '$lib/api/backend.api';
import { UserProfileNotFoundError } from '$lib/types/errors';
import type { OptionIdentity } from '$lib/types/identity';
import crypto from 'crypto';

function getTimestampNowNs(): bigint {
	return BigInt(Date.now()) * 1_000_000n;
}

const _createPowChallenge = async ({
	identity
}: {
	identity: OptionIdentity;
}): Promise<CreateChallengeResponse> => {
	const response: CreateChallengeResult = await createPowChallenge({
		identity
	});
	if ('Ok' in response) {
		return response.Ok;
	}
	const err = response.Err;
	if ('NotFound' in err) {
		throw new UserProfileNotFoundError();
	}
	throw new Error('Unknown error');
};

const pow_solve_challenge = async (timestamp: number, difficulty: number): Promise<number> => {
	if (difficulty <= 0) {
		throw new Error('Difficulty must be greater than zero');
	}

	let nonce = 0;
	const target = Math.floor(0xffffffff / difficulty);
	const startTimestamp = getTimestampNowNs();

	while (true) {
		const challengeStr = `${timestamp}.${nonce}`;
		const hash = crypto.createHash('sha256').update(challengeStr).digest();
		const prefix = hash.readUInt32BE(0);
		if (prefix <= target) {
			break;
		}
		nonce += 1;
	}

	const solveTimestampNs = getTimestampNowNs() - startTimestamp;
	console.error(
		`Pow Challenge: It took the client ${Number(solveTimestampNs) / 1e9} seconds to solve the challenge`
	);

	return nonce;
};
