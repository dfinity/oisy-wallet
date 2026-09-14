import type { SolInstruction, SolParsedLookupTableInstruction } from '$sol/types/sol-instructions';
import { assertNever } from '@dfinity/utils';
import {
	AddressLookupTableInstruction,
	identifyAddressLookupTableInstruction,
	parseCloseLookupTableInstruction,
	parseCreateLookupTableInstruction,
	parseDeactivateLookupTableInstruction,
	parseExtendLookupTableInstruction,
	parseFreezeLookupTableInstruction
} from '@solana-program/address-lookup-table';
import { assertIsInstructionWithAccounts, assertIsInstructionWithData } from '@solana/kit';

export const parseSolLookupTableInstruction = (
	instruction: SolInstruction
): SolParsedLookupTableInstruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);
	assertIsInstructionWithAccounts(instruction);

	const decodedInstruction = identifyAddressLookupTableInstruction(instruction);
	switch (decodedInstruction) {
		case AddressLookupTableInstruction.CreateLookupTable:
			return {
				...parseCreateLookupTableInstruction(instruction),
				instructionType: AddressLookupTableInstruction.CreateLookupTable
			};
		case AddressLookupTableInstruction.FreezeLookupTable:
			return {
				...parseFreezeLookupTableInstruction(instruction),
				instructionType: AddressLookupTableInstruction.FreezeLookupTable
			};
		case AddressLookupTableInstruction.ExtendLookupTable:
			return {
				...parseExtendLookupTableInstruction(instruction),
				instructionType: AddressLookupTableInstruction.ExtendLookupTable
			};
		case AddressLookupTableInstruction.DeactivateLookupTable:
			return {
				...parseDeactivateLookupTableInstruction(instruction),
				instructionType: AddressLookupTableInstruction.DeactivateLookupTable
			};
		case AddressLookupTableInstruction.CloseLookupTable:
			return {
				...parseCloseLookupTableInstruction(instruction),
				instructionType: AddressLookupTableInstruction.CloseLookupTable
			};
		default: {
			assertNever(
				decodedInstruction,
				`Unknown Solana Address Lookup Table instruction: ${decodedInstruction}`
			);
		}
	}
};
