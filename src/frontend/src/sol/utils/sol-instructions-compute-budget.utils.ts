import { ZERO } from '$lib/constants/app.constants';
import {
	MICROLAMPORTS_PER_LAMPORT,
	SOLANA_DEFAULT_COMPUTE_UNIT_LIMIT_PER_INSTRUCTION,
	SOLANA_MAX_COMPUTE_UNIT_LIMIT
} from '$sol/constants/sol.constants';
import type {
	SolInstruction,
	SolParsedComputeBudgetInstruction
} from '$sol/types/sol-instructions';
import { assertNever, isNullish } from '@dfinity/utils';
import {
	ComputeBudgetInstruction,
	identifyComputeBudgetInstruction,
	parseRequestHeapFrameInstruction,
	parseRequestUnitsInstruction,
	parseSetComputeUnitLimitInstruction,
	parseSetComputeUnitPriceInstruction,
	parseSetLoadedAccountsDataSizeLimitInstruction
} from '@solana-program/compute-budget';
import { assertIsInstructionWithData } from '@solana/kit';

export const parseSolComputeBudgetInstruction = (
	instruction: SolInstruction
): SolParsedComputeBudgetInstruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);

	const decodedInstruction = identifyComputeBudgetInstruction(instruction);
	switch (decodedInstruction) {
		case ComputeBudgetInstruction.RequestUnits:
			return {
				...parseRequestUnitsInstruction(instruction),
				instructionType: ComputeBudgetInstruction.RequestUnits
			};
		case ComputeBudgetInstruction.RequestHeapFrame:
			return {
				...parseRequestHeapFrameInstruction(instruction),
				instructionType: ComputeBudgetInstruction.RequestHeapFrame
			};
		case ComputeBudgetInstruction.SetComputeUnitLimit:
			return {
				...parseSetComputeUnitLimitInstruction(instruction),
				instructionType: ComputeBudgetInstruction.SetComputeUnitLimit
			};
		case ComputeBudgetInstruction.SetComputeUnitPrice:
			return {
				...parseSetComputeUnitPriceInstruction(instruction),
				instructionType: ComputeBudgetInstruction.SetComputeUnitPrice
			};
		case ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit:
			return {
				...parseSetLoadedAccountsDataSizeLimitInstruction(instruction),
				instructionType: ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit
			};
		default: {
			assertNever(
				decodedInstruction,
				`Unknown Solana Compute Budget instruction: ${decodedInstruction}`
			);
		}
	}
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
 * @param computeUnitLimit - Compute units requested via `SetComputeUnitLimit`, if any. When absent
 *   the runtime applies its per-instruction default, which is what the user would be charged for.
 * @param instructionsCount - Number of instructions in the message, used for that default.
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

	const requestedComputeUnitLimit =
		computeUnitLimit ??
		SOLANA_DEFAULT_COMPUTE_UNIT_LIMIT_PER_INSTRUCTION * BigInt(instructionsCount);

	// The runtime refuses anything above the transaction-wide cap, so a limit larger than it can
	// never actually be charged and must not be reported as if it could.
	const effectiveComputeUnitLimit =
		requestedComputeUnitLimit > SOLANA_MAX_COMPUTE_UNIT_LIMIT
			? SOLANA_MAX_COMPUTE_UNIT_LIMIT
			: requestedComputeUnitLimit;

	const microLamports = computeUnitPrice * effectiveComputeUnitLimit;

	// The runtime rounds the fee up to the next whole lamport.
	return (
		microLamports / MICROLAMPORTS_PER_LAMPORT +
		(microLamports % MICROLAMPORTS_PER_LAMPORT > ZERO ? 1n : ZERO)
	);
};
