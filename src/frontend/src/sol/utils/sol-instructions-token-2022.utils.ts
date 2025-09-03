import type { SolInstruction, SolParsedToken2022Instruction } from '$sol/types/sol-instructions';
import {
	Token2022Instruction,
	identifyToken2022Instruction,
	parseAmountToUiAmountInstruction,
	parseApplyConfidentialPendingBalanceInstruction,
	parseApproveCheckedInstruction,
	parseApproveConfidentialTransferAccountInstruction,
	parseApproveInstruction,
	parseBurnCheckedInstruction,
	parseBurnInstruction,
	parseCloseAccountInstruction,
	parseConfidentialDepositInstruction,
	parseConfidentialTransferInstruction,
	parseConfidentialTransferWithFeeInstruction,
	parseConfidentialWithdrawInstruction,
	parseConfigureConfidentialTransferAccountInstruction,
	parseCreateNativeMintInstruction,
	parseDisableConfidentialCreditsInstruction,
	parseDisableCpiGuardInstruction,
	parseDisableHarvestToMintInstruction,
	parseDisableMemoTransfersInstruction,
	parseDisableNonConfidentialCreditsInstruction,
	parseEmitTokenMetadataInstruction,
	parseEmptyConfidentialTransferAccountInstruction,
	parseEnableConfidentialCreditsInstruction,
	parseEnableCpiGuardInstruction,
	parseEnableHarvestToMintInstruction,
	parseEnableMemoTransfersInstruction,
	parseEnableNonConfidentialCreditsInstruction,
	parseFreezeAccountInstruction,
	parseGetAccountDataSizeInstruction,
	parseHarvestWithheldTokensToMintForConfidentialTransferFeeInstruction,
	parseHarvestWithheldTokensToMintInstruction,
	parseInitializeAccount2Instruction,
	parseInitializeAccount3Instruction,
	parseInitializeAccountInstruction,
	parseInitializeConfidentialTransferFeeInstruction,
	parseInitializeConfidentialTransferMintInstruction,
	parseInitializeDefaultAccountStateInstruction,
	parseInitializeGroupMemberPointerInstruction,
	parseInitializeGroupPointerInstruction,
	parseInitializeImmutableOwnerInstruction,
	parseInitializeInterestBearingMintInstruction,
	parseInitializeMetadataPointerInstruction,
	parseInitializeMint2Instruction,
	parseInitializeMintCloseAuthorityInstruction,
	parseInitializeMintInstruction,
	parseInitializeMultisig2Instruction,
	parseInitializeMultisigInstruction,
	parseInitializeNonTransferableMintInstruction,
	parseInitializePermanentDelegateInstruction,
	parseInitializeScaledUiAmountMintInstruction,
	parseInitializeTokenGroupInstruction,
	parseInitializeTokenGroupMemberInstruction,
	parseInitializeTokenMetadataInstruction,
	parseInitializeTransferFeeConfigInstruction,
	parseInitializeTransferHookInstruction,
	parseMintToCheckedInstruction,
	parseMintToInstruction,
	parseReallocateInstruction,
	parseRemoveTokenMetadataKeyInstruction,
	parseRevokeInstruction,
	parseSetAuthorityInstruction,
	parseSetTransferFeeInstruction,
	parseSyncNativeInstruction,
	parseThawAccountInstruction,
	parseTransferCheckedInstruction,
	parseTransferCheckedWithFeeInstruction,
	parseTransferInstruction,
	parseUiAmountToAmountInstruction,
	parseUpdateConfidentialTransferMintInstruction,
	parseUpdateDefaultAccountStateInstruction,
	parseUpdateGroupMemberPointerInstruction,
	parseUpdateGroupPointerInstruction,
	parseUpdateMetadataPointerInstruction,
	parseUpdateMultiplierScaledUiMintInstruction,
	parseUpdateRateInterestBearingMintInstruction,
	parseUpdateTokenGroupMaxSizeInstruction,
	parseUpdateTokenGroupUpdateAuthorityInstruction,
	parseUpdateTokenMetadataFieldInstruction,
	parseUpdateTokenMetadataUpdateAuthorityInstruction,
	parseUpdateTransferHookInstruction,
	parseWithdrawExcessLamportsInstruction,
	parseWithdrawWithheldTokensFromAccountsForConfidentialTransferFeeInstruction,
	parseWithdrawWithheldTokensFromAccountsInstruction,
	parseWithdrawWithheldTokensFromMintForConfidentialTransferFeeInstruction,
	parseWithdrawWithheldTokensFromMintInstruction
} from '@solana-program/token-2022';
import { assertIsInstructionWithAccounts, assertIsInstructionWithData } from '@solana/kit';

export const parseSolToken2022Instruction = (
	instruction: SolInstruction
): SolInstruction | SolParsedToken2022Instruction => {
	assertIsInstructionWithData<Uint8Array>(instruction);
	assertIsInstructionWithAccounts(instruction);

	const decodedInstruction = identifyToken2022Instruction(instruction);
	switch (decodedInstruction) {
		case Token2022Instruction.InitializeMint:
			return {
				...parseInitializeMintInstruction(instruction),
				instructionType: Token2022Instruction.InitializeMint
			};
		case Token2022Instruction.InitializeAccount:
			return {
				...parseInitializeAccountInstruction(instruction),
				instructionType: Token2022Instruction.InitializeAccount
			};
		case Token2022Instruction.InitializeMultisig:
			return {
				...parseInitializeMultisigInstruction(instruction),
				instructionType: Token2022Instruction.InitializeMultisig
			};
		case Token2022Instruction.Transfer:
			return {
				...parseTransferInstruction(instruction),
				instructionType: Token2022Instruction.Transfer
			};
		case Token2022Instruction.Approve:
			return {
				...parseApproveInstruction(instruction),
				instructionType: Token2022Instruction.Approve
			};
		case Token2022Instruction.Revoke:
			return {
				...parseRevokeInstruction(instruction),
				instructionType: Token2022Instruction.Revoke
			};
		case Token2022Instruction.SetAuthority:
			return {
				...parseSetAuthorityInstruction(instruction),
				instructionType: Token2022Instruction.SetAuthority
			};
		case Token2022Instruction.MintTo:
			return {
				...parseMintToInstruction(instruction),
				instructionType: Token2022Instruction.MintTo
			};
		case Token2022Instruction.Burn:
			return {
				...parseBurnInstruction(instruction),
				instructionType: Token2022Instruction.Burn
			};
		case Token2022Instruction.CloseAccount:
			return {
				...parseCloseAccountInstruction(instruction),
				instructionType: Token2022Instruction.CloseAccount
			};
		case Token2022Instruction.FreezeAccount:
			return {
				...parseFreezeAccountInstruction(instruction),
				instructionType: Token2022Instruction.FreezeAccount
			};
		case Token2022Instruction.ThawAccount:
			return {
				...parseThawAccountInstruction(instruction),
				instructionType: Token2022Instruction.ThawAccount
			};
		case Token2022Instruction.TransferChecked:
			return {
				...parseTransferCheckedInstruction(instruction),
				instructionType: Token2022Instruction.TransferChecked
			};
		case Token2022Instruction.ApproveChecked:
			return {
				...parseApproveCheckedInstruction(instruction),
				instructionType: Token2022Instruction.ApproveChecked
			};
		case Token2022Instruction.MintToChecked:
			return {
				...parseMintToCheckedInstruction(instruction),
				instructionType: Token2022Instruction.MintToChecked
			};
		case Token2022Instruction.BurnChecked:
			return {
				...parseBurnCheckedInstruction(instruction),
				instructionType: Token2022Instruction.BurnChecked
			};
		case Token2022Instruction.InitializeAccount2:
			return {
				...parseInitializeAccount2Instruction(instruction),
				instructionType: Token2022Instruction.InitializeAccount2
			};
		case Token2022Instruction.SyncNative:
			return {
				...parseSyncNativeInstruction(instruction),
				instructionType: Token2022Instruction.SyncNative
			};
		case Token2022Instruction.InitializeAccount3:
			return {
				...parseInitializeAccount3Instruction(instruction),
				instructionType: Token2022Instruction.InitializeAccount3
			};
		case Token2022Instruction.InitializeMultisig2:
			return {
				...parseInitializeMultisig2Instruction(instruction),
				instructionType: Token2022Instruction.InitializeMultisig2
			};
		case Token2022Instruction.InitializeMint2:
			return {
				...parseInitializeMint2Instruction(instruction),
				instructionType: Token2022Instruction.InitializeMint2
			};
		case Token2022Instruction.GetAccountDataSize:
			return {
				...parseGetAccountDataSizeInstruction(instruction),
				instructionType: Token2022Instruction.GetAccountDataSize
			};
		case Token2022Instruction.InitializeImmutableOwner:
			return {
				...parseInitializeImmutableOwnerInstruction(instruction),
				instructionType: Token2022Instruction.InitializeImmutableOwner
			};
		case Token2022Instruction.AmountToUiAmount:
			return {
				...parseAmountToUiAmountInstruction(instruction),
				instructionType: Token2022Instruction.AmountToUiAmount
			};
		case Token2022Instruction.UiAmountToAmount:
			return {
				...parseUiAmountToAmountInstruction(instruction),
				instructionType: Token2022Instruction.UiAmountToAmount
			};
		case Token2022Instruction.InitializeMintCloseAuthority:
			return {
				...parseInitializeMintCloseAuthorityInstruction(instruction),
				instructionType: Token2022Instruction.InitializeMintCloseAuthority
			};
		case Token2022Instruction.InitializeTransferFeeConfig:
			return {
				...parseInitializeTransferFeeConfigInstruction(instruction),
				instructionType: Token2022Instruction.InitializeTransferFeeConfig
			};
		case Token2022Instruction.TransferCheckedWithFee:
			return {
				...parseTransferCheckedWithFeeInstruction(instruction),
				instructionType: Token2022Instruction.TransferCheckedWithFee
			};
		case Token2022Instruction.WithdrawWithheldTokensFromMint:
			return {
				...parseWithdrawWithheldTokensFromMintInstruction(instruction),
				instructionType: Token2022Instruction.WithdrawWithheldTokensFromMint
			};
		case Token2022Instruction.WithdrawWithheldTokensFromAccounts:
			return {
				...parseWithdrawWithheldTokensFromAccountsInstruction(instruction),
				instructionType: Token2022Instruction.WithdrawWithheldTokensFromAccounts
			};
		case Token2022Instruction.HarvestWithheldTokensToMint:
			return {
				...parseHarvestWithheldTokensToMintInstruction(instruction),
				instructionType: Token2022Instruction.HarvestWithheldTokensToMint
			};
		case Token2022Instruction.SetTransferFee:
			return {
				...parseSetTransferFeeInstruction(instruction),
				instructionType: Token2022Instruction.SetTransferFee
			};
		case Token2022Instruction.InitializeConfidentialTransferMint:
			return {
				...parseInitializeConfidentialTransferMintInstruction(instruction),
				instructionType: Token2022Instruction.InitializeConfidentialTransferMint
			};
		case Token2022Instruction.UpdateConfidentialTransferMint:
			return {
				...parseUpdateConfidentialTransferMintInstruction(instruction),
				instructionType: Token2022Instruction.UpdateConfidentialTransferMint
			};
		case Token2022Instruction.ConfigureConfidentialTransferAccount:
			return {
				...parseConfigureConfidentialTransferAccountInstruction(instruction),
				instructionType: Token2022Instruction.ConfigureConfidentialTransferAccount
			};
		case Token2022Instruction.ApproveConfidentialTransferAccount:
			return {
				...parseApproveConfidentialTransferAccountInstruction(instruction),
				instructionType: Token2022Instruction.ApproveConfidentialTransferAccount
			};
		case Token2022Instruction.EmptyConfidentialTransferAccount:
			return {
				...parseEmptyConfidentialTransferAccountInstruction(instruction),
				instructionType: Token2022Instruction.EmptyConfidentialTransferAccount
			};
		case Token2022Instruction.ConfidentialDeposit:
			return {
				...parseConfidentialDepositInstruction(instruction),
				instructionType: Token2022Instruction.ConfidentialDeposit
			};
		case Token2022Instruction.ConfidentialWithdraw:
			return {
				...parseConfidentialWithdrawInstruction(instruction),
				instructionType: Token2022Instruction.ConfidentialWithdraw
			};
		case Token2022Instruction.ConfidentialTransfer:
			return {
				...parseConfidentialTransferInstruction(instruction),
				instructionType: Token2022Instruction.ConfidentialTransfer
			};
		case Token2022Instruction.ApplyConfidentialPendingBalance:
			return {
				...parseApplyConfidentialPendingBalanceInstruction(instruction),
				instructionType: Token2022Instruction.ApplyConfidentialPendingBalance
			};
		case Token2022Instruction.EnableConfidentialCredits:
			return {
				...parseEnableConfidentialCreditsInstruction(instruction),
				instructionType: Token2022Instruction.EnableConfidentialCredits
			};
		case Token2022Instruction.DisableConfidentialCredits:
			return {
				...parseDisableConfidentialCreditsInstruction(instruction),
				instructionType: Token2022Instruction.DisableConfidentialCredits
			};
		case Token2022Instruction.EnableNonConfidentialCredits:
			return {
				...parseEnableNonConfidentialCreditsInstruction(instruction),
				instructionType: Token2022Instruction.EnableNonConfidentialCredits
			};
		case Token2022Instruction.DisableNonConfidentialCredits:
			return {
				...parseDisableNonConfidentialCreditsInstruction(instruction),
				instructionType: Token2022Instruction.DisableNonConfidentialCredits
			};
		case Token2022Instruction.ConfidentialTransferWithFee:
			return {
				...parseConfidentialTransferWithFeeInstruction(instruction),
				instructionType: Token2022Instruction.ConfidentialTransferWithFee
			};
		case Token2022Instruction.InitializeDefaultAccountState:
			return {
				...parseInitializeDefaultAccountStateInstruction(instruction),
				instructionType: Token2022Instruction.InitializeDefaultAccountState
			};
		case Token2022Instruction.UpdateDefaultAccountState:
			return {
				...parseUpdateDefaultAccountStateInstruction(instruction),
				instructionType: Token2022Instruction.UpdateDefaultAccountState
			};
		case Token2022Instruction.Reallocate:
			return {
				...parseReallocateInstruction(instruction),
				instructionType: Token2022Instruction.Reallocate
			};
		case Token2022Instruction.EnableMemoTransfers:
			return {
				...parseEnableMemoTransfersInstruction(instruction),
				instructionType: Token2022Instruction.EnableMemoTransfers
			};
		case Token2022Instruction.DisableMemoTransfers:
			return {
				...parseDisableMemoTransfersInstruction(instruction),
				instructionType: Token2022Instruction.DisableMemoTransfers
			};
		case Token2022Instruction.CreateNativeMint:
			return {
				...parseCreateNativeMintInstruction(instruction),
				instructionType: Token2022Instruction.CreateNativeMint
			};
		case Token2022Instruction.InitializeNonTransferableMint:
			return {
				...parseInitializeNonTransferableMintInstruction(instruction),
				instructionType: Token2022Instruction.InitializeNonTransferableMint
			};
		case Token2022Instruction.InitializeInterestBearingMint:
			return {
				...parseInitializeInterestBearingMintInstruction(instruction),
				instructionType: Token2022Instruction.InitializeInterestBearingMint
			};
		case Token2022Instruction.UpdateRateInterestBearingMint:
			return {
				...parseUpdateRateInterestBearingMintInstruction(instruction),
				instructionType: Token2022Instruction.UpdateRateInterestBearingMint
			};
		case Token2022Instruction.EnableCpiGuard:
			return {
				...parseEnableCpiGuardInstruction(instruction),
				instructionType: Token2022Instruction.EnableCpiGuard
			};
		case Token2022Instruction.DisableCpiGuard:
			return {
				...parseDisableCpiGuardInstruction(instruction),
				instructionType: Token2022Instruction.DisableCpiGuard
			};
		case Token2022Instruction.InitializePermanentDelegate:
			return {
				...parseInitializePermanentDelegateInstruction(instruction),
				instructionType: Token2022Instruction.InitializePermanentDelegate
			};
		case Token2022Instruction.InitializeTransferHook:
			return {
				...parseInitializeTransferHookInstruction(instruction),
				instructionType: Token2022Instruction.InitializeTransferHook
			};
		case Token2022Instruction.UpdateTransferHook:
			return {
				...parseUpdateTransferHookInstruction(instruction),
				instructionType: Token2022Instruction.UpdateTransferHook
			};
		case Token2022Instruction.InitializeConfidentialTransferFee:
			return {
				...parseInitializeConfidentialTransferFeeInstruction(instruction),
				instructionType: Token2022Instruction.InitializeConfidentialTransferFee
			};
		case Token2022Instruction.WithdrawWithheldTokensFromMintForConfidentialTransferFee:
			return {
				...parseWithdrawWithheldTokensFromMintForConfidentialTransferFeeInstruction(instruction),
				instructionType:
					Token2022Instruction.WithdrawWithheldTokensFromMintForConfidentialTransferFee
			};
		case Token2022Instruction.WithdrawWithheldTokensFromAccountsForConfidentialTransferFee:
			return {
				...parseWithdrawWithheldTokensFromAccountsForConfidentialTransferFeeInstruction(
					instruction
				),
				instructionType:
					Token2022Instruction.WithdrawWithheldTokensFromAccountsForConfidentialTransferFee
			};
		case Token2022Instruction.HarvestWithheldTokensToMintForConfidentialTransferFee:
			return {
				...parseHarvestWithheldTokensToMintForConfidentialTransferFeeInstruction(instruction),
				instructionType: Token2022Instruction.HarvestWithheldTokensToMintForConfidentialTransferFee
			};
		case Token2022Instruction.EnableHarvestToMint:
			return {
				...parseEnableHarvestToMintInstruction(instruction),
				instructionType: Token2022Instruction.EnableHarvestToMint
			};
		case Token2022Instruction.DisableHarvestToMint:
			return {
				...parseDisableHarvestToMintInstruction(instruction),
				instructionType: Token2022Instruction.DisableHarvestToMint
			};
		case Token2022Instruction.WithdrawExcessLamports:
			return {
				...parseWithdrawExcessLamportsInstruction(instruction),
				instructionType: Token2022Instruction.WithdrawExcessLamports
			};
		case Token2022Instruction.InitializeMetadataPointer:
			return {
				...parseInitializeMetadataPointerInstruction(instruction),
				instructionType: Token2022Instruction.InitializeMetadataPointer
			};
		case Token2022Instruction.UpdateMetadataPointer:
			return {
				...parseUpdateMetadataPointerInstruction(instruction),
				instructionType: Token2022Instruction.UpdateMetadataPointer
			};
		case Token2022Instruction.InitializeGroupPointer:
			return {
				...parseInitializeGroupPointerInstruction(instruction),
				instructionType: Token2022Instruction.InitializeGroupPointer
			};
		case Token2022Instruction.UpdateGroupPointer:
			return {
				...parseUpdateGroupPointerInstruction(instruction),
				instructionType: Token2022Instruction.UpdateGroupPointer
			};
		case Token2022Instruction.InitializeGroupMemberPointer:
			return {
				...parseInitializeGroupMemberPointerInstruction(instruction),
				instructionType: Token2022Instruction.InitializeGroupMemberPointer
			};
		case Token2022Instruction.UpdateGroupMemberPointer:
			return {
				...parseUpdateGroupMemberPointerInstruction(instruction),
				instructionType: Token2022Instruction.UpdateGroupMemberPointer
			};
		case Token2022Instruction.InitializeScaledUiAmountMint:
			return {
				...parseInitializeScaledUiAmountMintInstruction(instruction),
				instructionType: Token2022Instruction.InitializeScaledUiAmountMint
			};
		case Token2022Instruction.UpdateMultiplierScaledUiMint:
			return {
				...parseUpdateMultiplierScaledUiMintInstruction(instruction),
				instructionType: Token2022Instruction.UpdateMultiplierScaledUiMint
			};
		case Token2022Instruction.InitializeTokenMetadata:
			return {
				...parseInitializeTokenMetadataInstruction(instruction),
				instructionType: Token2022Instruction.InitializeTokenMetadata
			};
		case Token2022Instruction.UpdateTokenMetadataField:
			return {
				...parseUpdateTokenMetadataFieldInstruction(instruction),
				instructionType: Token2022Instruction.UpdateTokenMetadataField
			};
		case Token2022Instruction.RemoveTokenMetadataKey:
			return {
				...parseRemoveTokenMetadataKeyInstruction(instruction),
				instructionType: Token2022Instruction.RemoveTokenMetadataKey
			};
		case Token2022Instruction.UpdateTokenMetadataUpdateAuthority:
			return {
				...parseUpdateTokenMetadataUpdateAuthorityInstruction(instruction),
				instructionType: Token2022Instruction.UpdateTokenMetadataUpdateAuthority
			};
		case Token2022Instruction.EmitTokenMetadata:
			return {
				...parseEmitTokenMetadataInstruction(instruction),
				instructionType: Token2022Instruction.EmitTokenMetadata
			};
		case Token2022Instruction.InitializeTokenGroup:
			return {
				...parseInitializeTokenGroupInstruction(instruction),
				instructionType: Token2022Instruction.InitializeTokenGroup
			};
		case Token2022Instruction.UpdateTokenGroupMaxSize:
			return {
				...parseUpdateTokenGroupMaxSizeInstruction(instruction),
				instructionType: Token2022Instruction.UpdateTokenGroupMaxSize
			};
		case Token2022Instruction.UpdateTokenGroupUpdateAuthority:
			return {
				...parseUpdateTokenGroupUpdateAuthorityInstruction(instruction),
				instructionType: Token2022Instruction.UpdateTokenGroupUpdateAuthority
			};
		case Token2022Instruction.InitializeTokenGroupMember:
			return {
				...parseInitializeTokenGroupMemberInstruction(instruction),
				instructionType: Token2022Instruction.InitializeTokenGroupMember
			};
		default:
			return instruction;
	}
};
