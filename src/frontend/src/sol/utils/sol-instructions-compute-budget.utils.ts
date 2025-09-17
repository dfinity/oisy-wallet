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
			// Force compiler error on unhandled cases based on leftover types
			const _: never = decodedInstruction;

			return instruction;
		}
	}
};
