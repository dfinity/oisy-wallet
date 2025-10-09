import type {
	SolInstruction,
	SolParsedComputeBudgetInstruction
} from '$sol/types/sol-instructions';
import { assertNever } from '@dfinity/utils';
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
