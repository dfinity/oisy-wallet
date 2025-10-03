import type { SolInstruction, SolParsedAtaInstruction } from '$sol/types/sol-instructions';
import { assertNever } from '@dfinity/utils';
import {
	AssociatedTokenInstruction,
	identifyAssociatedTokenInstruction,
	parseCreateAssociatedTokenIdempotentInstruction,
	parseCreateAssociatedTokenInstruction,
	parseRecoverNestedAssociatedTokenInstruction
} from '@solana-program/token';
import { assertIsInstructionWithAccounts, assertIsInstructionWithData } from '@solana/kit';

export const parseSolAtaInstruction = (instruction: SolInstruction): SolParsedAtaInstruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);
	assertIsInstructionWithAccounts(instruction);

	const decodedInstruction = identifyAssociatedTokenInstruction(instruction);
	switch (decodedInstruction) {
		case AssociatedTokenInstruction.CreateAssociatedToken:
			return {
				...parseCreateAssociatedTokenInstruction(instruction),
				instructionType: AssociatedTokenInstruction.CreateAssociatedToken
			};
		case AssociatedTokenInstruction.CreateAssociatedTokenIdempotent:
			return {
				...parseCreateAssociatedTokenIdempotentInstruction(instruction),
				instructionType: AssociatedTokenInstruction.CreateAssociatedTokenIdempotent
			};
		case AssociatedTokenInstruction.RecoverNestedAssociatedToken:
			return {
				...parseRecoverNestedAssociatedTokenInstruction(instruction),
				instructionType: AssociatedTokenInstruction.RecoverNestedAssociatedToken
			};
		default: {
			assertNever(decodedInstruction, `Unknown Solana ATA instruction: ${decodedInstruction}`);
		}
	}
};
