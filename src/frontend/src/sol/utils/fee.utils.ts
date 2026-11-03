import { ZERO } from '$lib/constants/app.constants';
import {
	MICROLAMPORTS_PER_LAMPORT,
	SOLANA_DEFAULT_COMPUTE_UNIT_LIMIT_PER_INSTRUCTION,
	SOLANA_MAX_COMPUTE_UNIT_LIMIT
} from '$sol/constants/sol.constants';
import { isNullish } from '@dfinity/utils';

/**
 * Resolve the compute unit limit a transaction message will actually be budgeted, and therefore
 * charged, for.
 *
 * @param computeUnitLimit - Compute units requested via `SetComputeUnitLimit`, if any. When absent
 *   the runtime applies its per-instruction default, which is what the user would be charged for.
 * @param instructionsCount - Number of instructions in the message, used for that default.
 */
export const resolveSolComputeUnitLimit = ({
	computeUnitLimit,
	instructionsCount
}: {
	computeUnitLimit?: bigint;
	instructionsCount: number;
}): bigint => {
	const requestedComputeUnitLimit =
		computeUnitLimit ??
		SOLANA_DEFAULT_COMPUTE_UNIT_LIMIT_PER_INSTRUCTION * BigInt(instructionsCount);

	// The runtime refuses anything above the transaction-wide cap, so a limit larger than it can
	// never actually be charged and must not be reported as if it could.
	return requestedComputeUnitLimit > SOLANA_MAX_COMPUTE_UNIT_LIMIT
		? SOLANA_MAX_COMPUTE_UNIT_LIMIT
		: requestedComputeUnitLimit;
};

/**
 * Turn a compute unit price into the lamport fee it produces over a given compute unit limit.
 *
 * Both the price a transaction sets and the price `getRecentPrioritizationFees` reports are in
 * micro-lamports *per compute unit*, so neither is a fee until it is multiplied by a limit and
 * scaled down. Comparing one against the other without this conversion compares two different
 * units and is meaningless.
 */
export const convertSolComputeUnitPriceToFee = ({
	computeUnitPrice,
	computeUnitLimit
}: {
	computeUnitPrice: bigint;
	computeUnitLimit: bigint;
}): bigint => {
	const microLamports = computeUnitPrice * computeUnitLimit;

	// The runtime rounds the fee up to the next whole lamport.
	return (
		microLamports / MICROLAMPORTS_PER_LAMPORT +
		(microLamports % MICROLAMPORTS_PER_LAMPORT > ZERO ? 1n : ZERO)
	);
};

/**
 * Compute the prioritisation fee a transaction message will be charged, in lamports.
 *
 * On Solana the prioritisation fee is not a field of the transaction: it is the product of the
 * compute unit price and the compute unit limit, both set by Compute Budget instructions bundled
 * with the rest of the message. A dApp is therefore free to attach an arbitrarily expensive one
 * next to a modest transfer, which is why it has to be surfaced for review on its own.
 *
 * @param computeUnitPrice - Price per compute unit, in micro-lamports, from `SetComputeUnitPrice`.
 * @param computeUnitLimit - Compute units requested via `SetComputeUnitLimit`, if any.
 * @param instructionsCount - Number of instructions in the message.
 * @returns The fee in lamports, or `undefined` when the message requests no prioritisation.
 */
export const calculateSolPrioritizationFee = ({
	computeUnitPrice,
	computeUnitLimit,
	instructionsCount
}: {
	computeUnitPrice?: bigint;
	computeUnitLimit?: bigint;
	instructionsCount: number;
}): bigint | undefined => {
	if (isNullish(computeUnitPrice) || computeUnitPrice <= ZERO) {
		return undefined;
	}

	return convertSolComputeUnitPriceToFee({
		computeUnitPrice,
		computeUnitLimit: resolveSolComputeUnitLimit({ computeUnitLimit, instructionsCount })
	});
};
