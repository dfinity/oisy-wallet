import type {
	SolInstruction,
	SolParsedComputeBudgetInstruction
} from '$sol/types/sol-instructions';
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
): SolInstruction | SolParsedComputeBudgetInstruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);

	const decodedInstruction = identifyComputeBudgetInstruction(instruction);

	if (decodedInstruction === ComputeBudgetInstruction.RequestUnits) {
		return {
			...parseRequestUnitsInstruction(instruction),
			instructionType: ComputeBudgetInstruction.RequestUnits
		};
	}

	if (decodedInstruction === ComputeBudgetInstruction.RequestHeapFrame) {
		return {
			...parseRequestHeapFrameInstruction(instruction),
			instructionType: ComputeBudgetInstruction.RequestHeapFrame
		};
	}

	if (decodedInstruction === ComputeBudgetInstruction.SetComputeUnitLimit) {
		return {
			...parseSetComputeUnitLimitInstruction(instruction),
			instructionType: ComputeBudgetInstruction.SetComputeUnitLimit
		};
	}

	if (decodedInstruction === ComputeBudgetInstruction.SetComputeUnitPrice) {
		return {
			...parseSetComputeUnitPriceInstruction(instruction),
			instructionType: ComputeBudgetInstruction.SetComputeUnitPrice
		};
	}

	if (decodedInstruction === ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit) {
		return {
			...parseSetLoadedAccountsDataSizeLimitInstruction(instruction),
			instructionType: ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit
		};
	}

	// Force compiler error on unhandled cases based on leftover types
	const _: never = decodedInstruction;

	return instruction;
};
