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

	if (decodedInstruction === SystemInstruction.CreateAccount) {
		return {
			...parseCreateAccountInstruction(instruction),
			instructionType: SystemInstruction.CreateAccount
		};
	}

	if (decodedInstruction === SystemInstruction.Assign) {
		return {
			...parseAssignInstruction(instruction),
			instructionType: SystemInstruction.Assign
		};
	}

	if (decodedInstruction === SystemInstruction.TransferSol) {
		return {
			...parseTransferSolInstruction(instruction),
			instructionType: SystemInstruction.TransferSol
		};
	}

	if (decodedInstruction === SystemInstruction.CreateAccountWithSeed) {
		return {
			...parseCreateAccountWithSeedInstruction(instruction),
			instructionType: SystemInstruction.CreateAccountWithSeed
		};
	}

	if (decodedInstruction === SystemInstruction.AdvanceNonceAccount) {
		return {
			...parseAdvanceNonceAccountInstruction(instruction),
			instructionType: SystemInstruction.AdvanceNonceAccount
		};
	}

	if (decodedInstruction === SystemInstruction.WithdrawNonceAccount) {
		return {
			...parseWithdrawNonceAccountInstruction(instruction),
			instructionType: SystemInstruction.WithdrawNonceAccount
		};
	}

	if (decodedInstruction === SystemInstruction.InitializeNonceAccount) {
		return {
			...parseInitializeNonceAccountInstruction(instruction),
			instructionType: SystemInstruction.InitializeNonceAccount
		};
	}

	if (decodedInstruction === SystemInstruction.AuthorizeNonceAccount) {
		return {
			...parseAuthorizeNonceAccountInstruction(instruction),
			instructionType: SystemInstruction.AuthorizeNonceAccount
		};
	}

	if (decodedInstruction === SystemInstruction.Allocate) {
		return {
			...parseAllocateInstruction(instruction),
			instructionType: SystemInstruction.Allocate
		};
	}

	if (decodedInstruction === SystemInstruction.AllocateWithSeed) {
		return {
			...parseAllocateWithSeedInstruction(instruction),
			instructionType: SystemInstruction.AllocateWithSeed
		};
	}

	if (decodedInstruction === SystemInstruction.AssignWithSeed) {
		return {
			...parseAssignWithSeedInstruction(instruction),
			instructionType: SystemInstruction.AssignWithSeed
		};
	}

	if (decodedInstruction === SystemInstruction.TransferSolWithSeed) {
		return {
			...parseTransferSolWithSeedInstruction(instruction),
			instructionType: SystemInstruction.TransferSolWithSeed
		};
	}

	if (decodedInstruction === SystemInstruction.UpgradeNonceAccount) {
		return {
			...parseUpgradeNonceAccountInstruction(instruction),
			instructionType: SystemInstruction.UpgradeNonceAccount
		};
	}

	// Force compiler error on unhandled cases based on leftover types
	const _: never = decodedInstruction;

	return instruction;
};
