import crypto from 'crypto';

function getTimestampNowNs(): bigint {
	return BigInt(Date.now()) * 1_000_000n;
}

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
