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
	switch (decodedInstruction) {
		case TokenInstruction.InitializeMint:
			return {
				...parseInitializeMintInstruction(instruction),
				instructionType: TokenInstruction.InitializeMint
			};
		case TokenInstruction.InitializeAccount:
			return {
				...parseInitializeAccountInstruction(instruction),
				instructionType: TokenInstruction.InitializeAccount
			};
		case TokenInstruction.InitializeMultisig:
			return {
				...parseInitializeMultisigInstruction(instruction),
				instructionType: TokenInstruction.InitializeMultisig
			};
		case TokenInstruction.Transfer:
			return {
				...parseTransferInstruction(instruction),
				instructionType: TokenInstruction.Transfer
			};
		case TokenInstruction.Approve:
			return {
				...parseApproveInstruction(instruction),
				instructionType: TokenInstruction.Approve
			};
		case TokenInstruction.Revoke:
			return {
				...parseRevokeInstruction(instruction),
				instructionType: TokenInstruction.Revoke
			};
		case TokenInstruction.SetAuthority:
			return {
				...parseSetAuthorityInstruction(instruction),
				instructionType: TokenInstruction.SetAuthority
			};
		case TokenInstruction.MintTo:
			return {
				...parseMintToInstruction(instruction),
				instructionType: TokenInstruction.MintTo
			};
		case TokenInstruction.Burn:
			return {
				...parseBurnInstruction(instruction),
				instructionType: TokenInstruction.Burn
			};
		case TokenInstruction.CloseAccount:
			return {
				...parseCloseAccountInstruction(instruction),
				instructionType: TokenInstruction.CloseAccount
			};
		case TokenInstruction.FreezeAccount:
			return {
				...parseFreezeAccountInstruction(instruction),
				instructionType: TokenInstruction.FreezeAccount
			};
		case TokenInstruction.ThawAccount:
			return {
				...parseThawAccountInstruction(instruction),
				instructionType: TokenInstruction.ThawAccount
			};
		case TokenInstruction.TransferChecked:
			return {
				...parseTransferCheckedInstruction(instruction),
				instructionType: TokenInstruction.TransferChecked
			};
		case TokenInstruction.ApproveChecked:
			return {
				...parseApproveCheckedInstruction(instruction),
				instructionType: TokenInstruction.ApproveChecked
			};
		case TokenInstruction.MintToChecked:
			return {
				...parseMintToCheckedInstruction(instruction),
				instructionType: TokenInstruction.MintToChecked
			};
		case TokenInstruction.BurnChecked:
			return {
				...parseBurnCheckedInstruction(instruction),
				instructionType: TokenInstruction.BurnChecked
			};
		case TokenInstruction.InitializeAccount2:
			return {
				...parseInitializeAccount2Instruction(instruction),
				instructionType: TokenInstruction.InitializeAccount2
			};
		case TokenInstruction.SyncNative:
			return {
				...parseSyncNativeInstruction(instruction),
				instructionType: TokenInstruction.SyncNative
			};
		case TokenInstruction.InitializeAccount3:
			return {
				...parseInitializeAccount3Instruction(instruction),
				instructionType: TokenInstruction.InitializeAccount3
			};
		case TokenInstruction.InitializeMultisig2:
			return {
				...parseInitializeMultisig2Instruction(instruction),
				instructionType: TokenInstruction.InitializeMultisig2
			};
		case TokenInstruction.InitializeMint2:
			return {
				...parseInitializeMint2Instruction(instruction),
				instructionType: TokenInstruction.InitializeMint2
			};
		case TokenInstruction.GetAccountDataSize:
			return {
				...parseGetAccountDataSizeInstruction(instruction),
				instructionType: TokenInstruction.GetAccountDataSize
			};
		case TokenInstruction.InitializeImmutableOwner:
			return {
				...parseInitializeImmutableOwnerInstruction(instruction),
				instructionType: TokenInstruction.InitializeImmutableOwner
			};
		case TokenInstruction.AmountToUiAmount:
			return {
				...parseAmountToUiAmountInstruction(instruction),
				instructionType: TokenInstruction.AmountToUiAmount
			};
		case TokenInstruction.UiAmountToAmount:
			return {
				...parseUiAmountToAmountInstruction(instruction),
				instructionType: TokenInstruction.UiAmountToAmount
			};
		default:
			return instruction;
	}
};
