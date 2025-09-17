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
	parseInitializePausableConfigInstruction,
	parseInitializePermanentDelegateInstruction,
	parseInitializeScaledUiAmountMintInstruction,
	parseInitializeTokenGroupInstruction,
	parseInitializeTokenGroupMemberInstruction,
	parseInitializeTokenMetadataInstruction,
	parseInitializeTransferFeeConfigInstruction,
	parseInitializeTransferHookInstruction,
	parseMintToCheckedInstruction,
	parseMintToInstruction,
	parsePauseInstruction,
	parseReallocateInstruction,
	parseRemoveTokenMetadataKeyInstruction,
	parseResumeInstruction,
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

	if (decodedInstruction === Token2022Instruction.InitializeMint) {
		return {
			...parseInitializeMintInstruction(instruction),
			instructionType: Token2022Instruction.InitializeMint
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeAccount) {
		return {
			...parseInitializeAccountInstruction(instruction),
			instructionType: Token2022Instruction.InitializeAccount
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeMultisig) {
		return {
			...parseInitializeMultisigInstruction(instruction),
			instructionType: Token2022Instruction.InitializeMultisig
		};
	}

	if (decodedInstruction === Token2022Instruction.Transfer) {
		return {
			...parseTransferInstruction(instruction),
			instructionType: Token2022Instruction.Transfer
		};
	}

	if (decodedInstruction === Token2022Instruction.Approve) {
		return {
			...parseApproveInstruction(instruction),
			instructionType: Token2022Instruction.Approve
		};
	}

	if (decodedInstruction === Token2022Instruction.Revoke) {
		return {
			...parseRevokeInstruction(instruction),
			instructionType: Token2022Instruction.Revoke
		};
	}

	if (decodedInstruction === Token2022Instruction.SetAuthority) {
		return {
			...parseSetAuthorityInstruction(instruction),
			instructionType: Token2022Instruction.SetAuthority
		};
	}

	if (decodedInstruction === Token2022Instruction.MintTo) {
		return {
			...parseMintToInstruction(instruction),
			instructionType: Token2022Instruction.MintTo
		};
	}

	if (decodedInstruction === Token2022Instruction.Burn) {
		return {
			...parseBurnInstruction(instruction),
			instructionType: Token2022Instruction.Burn
		};
	}

	if (decodedInstruction === Token2022Instruction.CloseAccount) {
		return {
			...parseCloseAccountInstruction(instruction),
			instructionType: Token2022Instruction.CloseAccount
		};
	}

	if (decodedInstruction === Token2022Instruction.FreezeAccount) {
		return {
			...parseFreezeAccountInstruction(instruction),
			instructionType: Token2022Instruction.FreezeAccount
		};
	}

	if (decodedInstruction === Token2022Instruction.ThawAccount) {
		return {
			...parseThawAccountInstruction(instruction),
			instructionType: Token2022Instruction.ThawAccount
		};
	}

	if (decodedInstruction === Token2022Instruction.TransferChecked) {
		return {
			...parseTransferCheckedInstruction(instruction),
			instructionType: Token2022Instruction.TransferChecked
		};
	}

	if (decodedInstruction === Token2022Instruction.ApproveChecked) {
		return {
			...parseApproveCheckedInstruction(instruction),
			instructionType: Token2022Instruction.ApproveChecked
		};
	}

	if (decodedInstruction === Token2022Instruction.MintToChecked) {
		return {
			...parseMintToCheckedInstruction(instruction),
			instructionType: Token2022Instruction.MintToChecked
		};
	}

	if (decodedInstruction === Token2022Instruction.BurnChecked) {
		return {
			...parseBurnCheckedInstruction(instruction),
			instructionType: Token2022Instruction.BurnChecked
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeAccount2) {
		return {
			...parseInitializeAccount2Instruction(instruction),
			instructionType: Token2022Instruction.InitializeAccount2
		};
	}

	if (decodedInstruction === Token2022Instruction.SyncNative) {
		return {
			...parseSyncNativeInstruction(instruction),
			instructionType: Token2022Instruction.SyncNative
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeAccount3) {
		return {
			...parseInitializeAccount3Instruction(instruction),
			instructionType: Token2022Instruction.InitializeAccount3
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeMultisig2) {
		return {
			...parseInitializeMultisig2Instruction(instruction),
			instructionType: Token2022Instruction.InitializeMultisig2
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeMint2) {
		return {
			...parseInitializeMint2Instruction(instruction),
			instructionType: Token2022Instruction.InitializeMint2
		};
	}

	if (decodedInstruction === Token2022Instruction.GetAccountDataSize) {
		return {
			...parseGetAccountDataSizeInstruction(instruction),
			instructionType: Token2022Instruction.GetAccountDataSize
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeImmutableOwner) {
		return {
			...parseInitializeImmutableOwnerInstruction(instruction),
			instructionType: Token2022Instruction.InitializeImmutableOwner
		};
	}

	if (decodedInstruction === Token2022Instruction.AmountToUiAmount) {
		return {
			...parseAmountToUiAmountInstruction(instruction),
			instructionType: Token2022Instruction.AmountToUiAmount
		};
	}

	if (decodedInstruction === Token2022Instruction.UiAmountToAmount) {
		return {
			...parseUiAmountToAmountInstruction(instruction),
			instructionType: Token2022Instruction.UiAmountToAmount
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeMintCloseAuthority) {
		return {
			...parseInitializeMintCloseAuthorityInstruction(instruction),
			instructionType: Token2022Instruction.InitializeMintCloseAuthority
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeTransferFeeConfig) {
		return {
			...parseInitializeTransferFeeConfigInstruction(instruction),
			instructionType: Token2022Instruction.InitializeTransferFeeConfig
		};
	}

	if (decodedInstruction === Token2022Instruction.TransferCheckedWithFee) {
		return {
			...parseTransferCheckedWithFeeInstruction(instruction),
			instructionType: Token2022Instruction.TransferCheckedWithFee
		};
	}

	if (decodedInstruction === Token2022Instruction.WithdrawWithheldTokensFromMint) {
		return {
			...parseWithdrawWithheldTokensFromMintInstruction(instruction),
			instructionType: Token2022Instruction.WithdrawWithheldTokensFromMint
		};
	}

	if (decodedInstruction === Token2022Instruction.WithdrawWithheldTokensFromAccounts) {
		return {
			...parseWithdrawWithheldTokensFromAccountsInstruction(instruction),
			instructionType: Token2022Instruction.WithdrawWithheldTokensFromAccounts
		};
	}

	if (decodedInstruction === Token2022Instruction.HarvestWithheldTokensToMint) {
		return {
			...parseHarvestWithheldTokensToMintInstruction(instruction),
			instructionType: Token2022Instruction.HarvestWithheldTokensToMint
		};
	}

	if (decodedInstruction === Token2022Instruction.SetTransferFee) {
		return {
			...parseSetTransferFeeInstruction(instruction),
			instructionType: Token2022Instruction.SetTransferFee
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeConfidentialTransferMint) {
		return {
			...parseInitializeConfidentialTransferMintInstruction(instruction),
			instructionType: Token2022Instruction.InitializeConfidentialTransferMint
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateConfidentialTransferMint) {
		return {
			...parseUpdateConfidentialTransferMintInstruction(instruction),
			instructionType: Token2022Instruction.UpdateConfidentialTransferMint
		};
	}

	if (decodedInstruction === Token2022Instruction.ConfigureConfidentialTransferAccount) {
		return {
			...parseConfigureConfidentialTransferAccountInstruction(instruction),
			instructionType: Token2022Instruction.ConfigureConfidentialTransferAccount
		};
	}

	if (decodedInstruction === Token2022Instruction.ApproveConfidentialTransferAccount) {
		return {
			...parseApproveConfidentialTransferAccountInstruction(instruction),
			instructionType: Token2022Instruction.ApproveConfidentialTransferAccount
		};
	}

	if (decodedInstruction === Token2022Instruction.EmptyConfidentialTransferAccount) {
		return {
			...parseEmptyConfidentialTransferAccountInstruction(instruction),
			instructionType: Token2022Instruction.EmptyConfidentialTransferAccount
		};
	}

	if (decodedInstruction === Token2022Instruction.ConfidentialDeposit) {
		return {
			...parseConfidentialDepositInstruction(instruction),
			instructionType: Token2022Instruction.ConfidentialDeposit
		};
	}

	if (decodedInstruction === Token2022Instruction.ConfidentialWithdraw) {
		return {
			...parseConfidentialWithdrawInstruction(instruction),
			instructionType: Token2022Instruction.ConfidentialWithdraw
		};
	}

	if (decodedInstruction === Token2022Instruction.ConfidentialTransfer) {
		return {
			...parseConfidentialTransferInstruction(instruction),
			instructionType: Token2022Instruction.ConfidentialTransfer
		};
	}

	if (decodedInstruction === Token2022Instruction.ApplyConfidentialPendingBalance) {
		return {
			...parseApplyConfidentialPendingBalanceInstruction(instruction),
			instructionType: Token2022Instruction.ApplyConfidentialPendingBalance
		};
	}

	if (decodedInstruction === Token2022Instruction.EnableConfidentialCredits) {
		return {
			...parseEnableConfidentialCreditsInstruction(instruction),
			instructionType: Token2022Instruction.EnableConfidentialCredits
		};
	}

	if (decodedInstruction === Token2022Instruction.DisableConfidentialCredits) {
		return {
			...parseDisableConfidentialCreditsInstruction(instruction),
			instructionType: Token2022Instruction.DisableConfidentialCredits
		};
	}

	if (decodedInstruction === Token2022Instruction.EnableNonConfidentialCredits) {
		return {
			...parseEnableNonConfidentialCreditsInstruction(instruction),
			instructionType: Token2022Instruction.EnableNonConfidentialCredits
		};
	}

	if (decodedInstruction === Token2022Instruction.DisableNonConfidentialCredits) {
		return {
			...parseDisableNonConfidentialCreditsInstruction(instruction),
			instructionType: Token2022Instruction.DisableNonConfidentialCredits
		};
	}

	if (decodedInstruction === Token2022Instruction.ConfidentialTransferWithFee) {
		return {
			...parseConfidentialTransferWithFeeInstruction(instruction),
			instructionType: Token2022Instruction.ConfidentialTransferWithFee
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeDefaultAccountState) {
		return {
			...parseInitializeDefaultAccountStateInstruction(instruction),
			instructionType: Token2022Instruction.InitializeDefaultAccountState
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateDefaultAccountState) {
		return {
			...parseUpdateDefaultAccountStateInstruction(instruction),
			instructionType: Token2022Instruction.UpdateDefaultAccountState
		};
	}

	if (decodedInstruction === Token2022Instruction.Reallocate) {
		return {
			...parseReallocateInstruction(instruction),
			instructionType: Token2022Instruction.Reallocate
		};
	}

	if (decodedInstruction === Token2022Instruction.EnableMemoTransfers) {
		return {
			...parseEnableMemoTransfersInstruction(instruction),
			instructionType: Token2022Instruction.EnableMemoTransfers
		};
	}

	if (decodedInstruction === Token2022Instruction.DisableMemoTransfers) {
		return {
			...parseDisableMemoTransfersInstruction(instruction),
			instructionType: Token2022Instruction.DisableMemoTransfers
		};
	}

	if (decodedInstruction === Token2022Instruction.CreateNativeMint) {
		return {
			...parseCreateNativeMintInstruction(instruction),
			instructionType: Token2022Instruction.CreateNativeMint
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeNonTransferableMint) {
		return {
			...parseInitializeNonTransferableMintInstruction(instruction),
			instructionType: Token2022Instruction.InitializeNonTransferableMint
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeInterestBearingMint) {
		return {
			...parseInitializeInterestBearingMintInstruction(instruction),
			instructionType: Token2022Instruction.InitializeInterestBearingMint
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateRateInterestBearingMint) {
		return {
			...parseUpdateRateInterestBearingMintInstruction(instruction),
			instructionType: Token2022Instruction.UpdateRateInterestBearingMint
		};
	}

	if (decodedInstruction === Token2022Instruction.EnableCpiGuard) {
		return {
			...parseEnableCpiGuardInstruction(instruction),
			instructionType: Token2022Instruction.EnableCpiGuard
		};
	}

	if (decodedInstruction === Token2022Instruction.DisableCpiGuard) {
		return {
			...parseDisableCpiGuardInstruction(instruction),
			instructionType: Token2022Instruction.DisableCpiGuard
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializePermanentDelegate) {
		return {
			...parseInitializePermanentDelegateInstruction(instruction),
			instructionType: Token2022Instruction.InitializePermanentDelegate
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeTransferHook) {
		return {
			...parseInitializeTransferHookInstruction(instruction),
			instructionType: Token2022Instruction.InitializeTransferHook
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateTransferHook) {
		return {
			...parseUpdateTransferHookInstruction(instruction),
			instructionType: Token2022Instruction.UpdateTransferHook
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeConfidentialTransferFee) {
		return {
			...parseInitializeConfidentialTransferFeeInstruction(instruction),
			instructionType: Token2022Instruction.InitializeConfidentialTransferFee
		};
	}

	if (
		decodedInstruction ===
		Token2022Instruction.WithdrawWithheldTokensFromMintForConfidentialTransferFee
	) {
		return {
			...parseWithdrawWithheldTokensFromMintForConfidentialTransferFeeInstruction(instruction),
			instructionType: Token2022Instruction.WithdrawWithheldTokensFromMintForConfidentialTransferFee
		};
	}

	if (
		decodedInstruction ===
		Token2022Instruction.WithdrawWithheldTokensFromAccountsForConfidentialTransferFee
	) {
		return {
			...parseWithdrawWithheldTokensFromAccountsForConfidentialTransferFeeInstruction(instruction),
			instructionType:
				Token2022Instruction.WithdrawWithheldTokensFromAccountsForConfidentialTransferFee
		};
	}

	if (
		decodedInstruction ===
		Token2022Instruction.HarvestWithheldTokensToMintForConfidentialTransferFee
	) {
		return {
			...parseHarvestWithheldTokensToMintForConfidentialTransferFeeInstruction(instruction),
			instructionType: Token2022Instruction.HarvestWithheldTokensToMintForConfidentialTransferFee
		};
	}

	if (decodedInstruction === Token2022Instruction.EnableHarvestToMint) {
		return {
			...parseEnableHarvestToMintInstruction(instruction),
			instructionType: Token2022Instruction.EnableHarvestToMint
		};
	}

	if (decodedInstruction === Token2022Instruction.DisableHarvestToMint) {
		return {
			...parseDisableHarvestToMintInstruction(instruction),
			instructionType: Token2022Instruction.DisableHarvestToMint
		};
	}

	if (decodedInstruction === Token2022Instruction.WithdrawExcessLamports) {
		return {
			...parseWithdrawExcessLamportsInstruction(instruction),
			instructionType: Token2022Instruction.WithdrawExcessLamports
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeMetadataPointer) {
		return {
			...parseInitializeMetadataPointerInstruction(instruction),
			instructionType: Token2022Instruction.InitializeMetadataPointer
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateMetadataPointer) {
		return {
			...parseUpdateMetadataPointerInstruction(instruction),
			instructionType: Token2022Instruction.UpdateMetadataPointer
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeGroupPointer) {
		return {
			...parseInitializeGroupPointerInstruction(instruction),
			instructionType: Token2022Instruction.InitializeGroupPointer
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateGroupPointer) {
		return {
			...parseUpdateGroupPointerInstruction(instruction),
			instructionType: Token2022Instruction.UpdateGroupPointer
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeGroupMemberPointer) {
		return {
			...parseInitializeGroupMemberPointerInstruction(instruction),
			instructionType: Token2022Instruction.InitializeGroupMemberPointer
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateGroupMemberPointer) {
		return {
			...parseUpdateGroupMemberPointerInstruction(instruction),
			instructionType: Token2022Instruction.UpdateGroupMemberPointer
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeScaledUiAmountMint) {
		return {
			...parseInitializeScaledUiAmountMintInstruction(instruction),
			instructionType: Token2022Instruction.InitializeScaledUiAmountMint
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateMultiplierScaledUiMint) {
		return {
			...parseUpdateMultiplierScaledUiMintInstruction(instruction),
			instructionType: Token2022Instruction.UpdateMultiplierScaledUiMint
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializePausableConfig) {
		return {
			...parseInitializePausableConfigInstruction(instruction),
			instructionType: Token2022Instruction.InitializePausableConfig
		};
	}

	if (decodedInstruction === Token2022Instruction.Pause) {
		return {
			...parsePauseInstruction(instruction),
			instructionType: Token2022Instruction.Pause
		};
	}

	if (decodedInstruction === Token2022Instruction.Resume) {
		return {
			...parseResumeInstruction(instruction),
			instructionType: Token2022Instruction.Resume
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeTokenMetadata) {
		return {
			...parseInitializeTokenMetadataInstruction(instruction),
			instructionType: Token2022Instruction.InitializeTokenMetadata
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateTokenMetadataField) {
		return {
			...parseUpdateTokenMetadataFieldInstruction(instruction),
			instructionType: Token2022Instruction.UpdateTokenMetadataField
		};
	}

	if (decodedInstruction === Token2022Instruction.RemoveTokenMetadataKey) {
		return {
			...parseRemoveTokenMetadataKeyInstruction(instruction),
			instructionType: Token2022Instruction.RemoveTokenMetadataKey
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateTokenMetadataUpdateAuthority) {
		return {
			...parseUpdateTokenMetadataUpdateAuthorityInstruction(instruction),
			instructionType: Token2022Instruction.UpdateTokenMetadataUpdateAuthority
		};
	}

	if (decodedInstruction === Token2022Instruction.EmitTokenMetadata) {
		return {
			...parseEmitTokenMetadataInstruction(instruction),
			instructionType: Token2022Instruction.EmitTokenMetadata
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeTokenGroup) {
		return {
			...parseInitializeTokenGroupInstruction(instruction),
			instructionType: Token2022Instruction.InitializeTokenGroup
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateTokenGroupMaxSize) {
		return {
			...parseUpdateTokenGroupMaxSizeInstruction(instruction),
			instructionType: Token2022Instruction.UpdateTokenGroupMaxSize
		};
	}

	if (decodedInstruction === Token2022Instruction.UpdateTokenGroupUpdateAuthority) {
		return {
			...parseUpdateTokenGroupUpdateAuthorityInstruction(instruction),
			instructionType: Token2022Instruction.UpdateTokenGroupUpdateAuthority
		};
	}

	if (decodedInstruction === Token2022Instruction.InitializeTokenGroupMember) {
		return {
			...parseInitializeTokenGroupMemberInstruction(instruction),
			instructionType: Token2022Instruction.InitializeTokenGroupMember
		};
	}

	// Force compiler error on unhandled cases based on leftover types
	const _: never = decodedInstruction;

	return instruction;
};
