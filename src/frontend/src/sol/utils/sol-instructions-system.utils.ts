import type { SolInstruction, SolParsedSystemInstruction } from '$sol/types/sol-instructions';
import {
	SystemInstruction,
	identifySystemInstruction,
	parseAdvanceNonceAccountInstruction,
	parseAllocateInstruction,
	parseAllocateWithSeedInstruction,
	parseAssignInstruction,
	parseAssignWithSeedInstruction,
	parseAuthorizeNonceAccountInstruction,
	parseCreateAccountInstruction,
	parseCreateAccountWithSeedInstruction,
	parseInitializeNonceAccountInstruction,
	parseTransferSolInstruction,
	parseTransferSolWithSeedInstruction,
	parseUpgradeNonceAccountInstruction,
	parseWithdrawNonceAccountInstruction
} from '@solana-program/system';
import { assertIsInstructionWithAccounts, assertIsInstructionWithData } from '@solana/kit';

export const parseSolSystemInstruction = (
	instruction: SolInstruction
): SolInstruction | SolParsedSystemInstruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);
	assertIsInstructionWithAccounts(instruction);

	const decodedInstruction = identifySystemInstruction(instruction);
	switch (decodedInstruction) {
		case SystemInstruction.CreateAccount:
			return {
				...parseCreateAccountInstruction(instruction),
				instructionType: SystemInstruction.CreateAccount
			};
		case SystemInstruction.Assign:
			return {
				...parseAssignInstruction(instruction),
				instructionType: SystemInstruction.Assign
			};
		case SystemInstruction.TransferSol:
			return {
				...parseTransferSolInstruction(instruction),
				instructionType: SystemInstruction.TransferSol
			};
		case SystemInstruction.CreateAccountWithSeed:
			return {
				...parseCreateAccountWithSeedInstruction(instruction),
				instructionType: SystemInstruction.CreateAccountWithSeed
			};
		case SystemInstruction.AdvanceNonceAccount:
			return {
				...parseAdvanceNonceAccountInstruction(instruction),
				instructionType: SystemInstruction.AdvanceNonceAccount
			};
		case SystemInstruction.WithdrawNonceAccount:
			return {
				...parseWithdrawNonceAccountInstruction(instruction),
				instructionType: SystemInstruction.WithdrawNonceAccount
			};
		case SystemInstruction.InitializeNonceAccount:
			return {
				...parseInitializeNonceAccountInstruction(instruction),
				instructionType: SystemInstruction.InitializeNonceAccount
			};
		case SystemInstruction.AuthorizeNonceAccount:
			return {
				...parseAuthorizeNonceAccountInstruction(instruction),
				instructionType: SystemInstruction.AuthorizeNonceAccount
			};
		case SystemInstruction.Allocate:
			return {
				...parseAllocateInstruction(instruction),
				instructionType: SystemInstruction.Allocate
			};
		case SystemInstruction.AllocateWithSeed:
			return {
				...parseAllocateWithSeedInstruction(instruction),
				instructionType: SystemInstruction.AllocateWithSeed
			};
		case SystemInstruction.AssignWithSeed:
			return {
				...parseAssignWithSeedInstruction(instruction),
				instructionType: SystemInstruction.AssignWithSeed
			};
		case SystemInstruction.TransferSolWithSeed:
			return {
				...parseTransferSolWithSeedInstruction(instruction),
				instructionType: SystemInstruction.TransferSolWithSeed
			};
		case SystemInstruction.UpgradeNonceAccount:
			return {
				...parseUpgradeNonceAccountInstruction(instruction),
				instructionType: SystemInstruction.UpgradeNonceAccount
			};
		default: {
			// Force compiler error on unhandled cases based on leftover types
			const _: never = decodedInstruction;

			return instruction;
		}
	}
};
