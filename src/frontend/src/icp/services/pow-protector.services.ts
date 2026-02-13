import { CYCLES_LEDGER_CANISTER_ID } from '$env/networks/networks.icrc.env';
import { allowance } from '$icp/api/icrc-ledger.api';
import { getIcrcSubaccount } from '$icp/utils/icrc-account.utils';
import { BACKEND_CANISTER_PRINCIPAL, SIGNER_CANISTER_ID, ZERO } from '$lib/constants/app.constants';
import { hashText } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

export const hasRequiredCycles = async ({
	identity,
	requiredCycles
}: {
	identity: Identity;
	requiredCycles: bigint;
}): Promise<boolean> => {
	const allowanceResult = await allowance({
		identity,
		certified: false,
		ledgerCanisterId: CYCLES_LEDGER_CANISTER_ID,
		owner: {
			owner: BACKEND_CANISTER_PRINCIPAL,
			subaccount: undefined
		},
		spender: {
			owner: Principal.fromText(SIGNER_CANISTER_ID),
			subaccount: getIcrcSubaccount(identity.getPrincipal())
		}
	});
	return allowanceResult.allowance >= requiredCycles;
};

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
	let nonce = ZERO;

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
