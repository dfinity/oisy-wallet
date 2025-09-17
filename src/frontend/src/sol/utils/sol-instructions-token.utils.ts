import type { SolInstruction, SolParsedTokenInstruction } from '$sol/types/sol-instructions';
import {
	TokenInstruction,
	identifyTokenInstruction,
	parseAmountToUiAmountInstruction,
	parseApproveCheckedInstruction,
	parseApproveInstruction,
	parseBurnCheckedInstruction,
	parseBurnInstruction,
	parseCloseAccountInstruction,
	parseFreezeAccountInstruction,
	parseGetAccountDataSizeInstruction,
	parseInitializeAccount2Instruction,
	parseInitializeAccount3Instruction,
	parseInitializeAccountInstruction,
	parseInitializeImmutableOwnerInstruction,
	parseInitializeMint2Instruction,
	parseInitializeMintInstruction,
	parseInitializeMultisig2Instruction,
	parseInitializeMultisigInstruction,
	parseMintToCheckedInstruction,
	parseMintToInstruction,
	parseRevokeInstruction,
	parseSetAuthorityInstruction,
	parseSyncNativeInstruction,
	parseThawAccountInstruction,
	parseTransferCheckedInstruction,
	parseTransferInstruction,
	parseUiAmountToAmountInstruction
} from '@solana-program/token';
import { assertIsInstructionWithAccounts, assertIsInstructionWithData } from '@solana/kit';

export const parseSolTokenInstruction = (
	instruction: SolInstruction
): SolInstruction | SolParsedTokenInstruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);
	assertIsInstructionWithAccounts(instruction);

	const decodedInstruction = identifyTokenInstruction(instruction);

	if (decodedInstruction === TokenInstruction.InitializeMint) {
		return {
			...parseInitializeMintInstruction(instruction),
			instructionType: TokenInstruction.InitializeMint
		};
	}

	if (decodedInstruction === TokenInstruction.InitializeAccount) {
		return {
			...parseInitializeAccountInstruction(instruction),
			instructionType: TokenInstruction.InitializeAccount
		};
	}

	if (decodedInstruction === TokenInstruction.InitializeMultisig) {
		return {
			...parseInitializeMultisigInstruction(instruction),
			instructionType: TokenInstruction.InitializeMultisig
		};
	}

	if (decodedInstruction === TokenInstruction.Transfer) {
		return {
			...parseTransferInstruction(instruction),
			instructionType: TokenInstruction.Transfer
		};
	}

	if (decodedInstruction === TokenInstruction.Approve) {
		return {
			...parseApproveInstruction(instruction),
			instructionType: TokenInstruction.Approve
		};
	}

	if (decodedInstruction === TokenInstruction.Revoke) {
		return {
			...parseRevokeInstruction(instruction),
			instructionType: TokenInstruction.Revoke
		};
	}

	if (decodedInstruction === TokenInstruction.SetAuthority) {
		return {
			...parseSetAuthorityInstruction(instruction),
			instructionType: TokenInstruction.SetAuthority
		};
	}

	if (decodedInstruction === TokenInstruction.MintTo) {
		return {
			...parseMintToInstruction(instruction),
			instructionType: TokenInstruction.MintTo
		};
	}

	if (decodedInstruction === TokenInstruction.Burn) {
		return {
			...parseBurnInstruction(instruction),
			instructionType: TokenInstruction.Burn
		};
	}

	if (decodedInstruction === TokenInstruction.CloseAccount) {
		return {
			...parseCloseAccountInstruction(instruction),
			instructionType: TokenInstruction.CloseAccount
		};
	}

	if (decodedInstruction === TokenInstruction.FreezeAccount) {
		return {
			...parseFreezeAccountInstruction(instruction),
			instructionType: TokenInstruction.FreezeAccount
		};
	}

	if (decodedInstruction === TokenInstruction.ThawAccount) {
		return {
			...parseThawAccountInstruction(instruction),
			instructionType: TokenInstruction.ThawAccount
		};
	}

	if (decodedInstruction === TokenInstruction.TransferChecked) {
		return {
			...parseTransferCheckedInstruction(instruction),
			instructionType: TokenInstruction.TransferChecked
		};
	}

	if (decodedInstruction === TokenInstruction.ApproveChecked) {
		return {
			...parseApproveCheckedInstruction(instruction),
			instructionType: TokenInstruction.ApproveChecked
		};
	}

	if (decodedInstruction === TokenInstruction.MintToChecked) {
		return {
			...parseMintToCheckedInstruction(instruction),
			instructionType: TokenInstruction.MintToChecked
		};
	}

	if (decodedInstruction === TokenInstruction.BurnChecked) {
		return {
			...parseBurnCheckedInstruction(instruction),
			instructionType: TokenInstruction.BurnChecked
		};
	}

	if (decodedInstruction === TokenInstruction.InitializeAccount2) {
		return {
			...parseInitializeAccount2Instruction(instruction),
			instructionType: TokenInstruction.InitializeAccount2
		};
	}

	if (decodedInstruction === TokenInstruction.SyncNative) {
		return {
			...parseSyncNativeInstruction(instruction),
			instructionType: TokenInstruction.SyncNative
		};
	}

	if (decodedInstruction === TokenInstruction.InitializeAccount3) {
		return {
			...parseInitializeAccount3Instruction(instruction),
			instructionType: TokenInstruction.InitializeAccount3
		};
	}

	if (decodedInstruction === TokenInstruction.InitializeMultisig2) {
		return {
			...parseInitializeMultisig2Instruction(instruction),
			instructionType: TokenInstruction.InitializeMultisig2
		};
	}

	if (decodedInstruction === TokenInstruction.InitializeMint2) {
		return {
			...parseInitializeMint2Instruction(instruction),
			instructionType: TokenInstruction.InitializeMint2
		};
	}

	if (decodedInstruction === TokenInstruction.GetAccountDataSize) {
		return {
			...parseGetAccountDataSizeInstruction(instruction),
			instructionType: TokenInstruction.GetAccountDataSize
		};
	}

	if (decodedInstruction === TokenInstruction.InitializeImmutableOwner) {
		return {
			...parseInitializeImmutableOwnerInstruction(instruction),
			instructionType: TokenInstruction.InitializeImmutableOwner
		};
	}

	if (decodedInstruction === TokenInstruction.AmountToUiAmount) {
		return {
			...parseAmountToUiAmountInstruction(instruction),
			instructionType: TokenInstruction.AmountToUiAmount
		};
	}

	if (decodedInstruction === TokenInstruction.UiAmountToAmount) {
		return {
			...parseUiAmountToAmountInstruction(instruction),
			instructionType: TokenInstruction.UiAmountToAmount
		};
	}

	// Force compiler error on unhandled cases based on leftover types
	const _: never = decodedInstruction;

	return instruction;
};
