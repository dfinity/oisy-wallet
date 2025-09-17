import type { SolInstruction } from '$sol/types/sol-instructions';
import { parseSolToken2022Instruction } from '$sol/utils/sol-instructions-token-2022.utils';
import { mockSolAddress } from '$tests/mocks/sol.mock';
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
import { address } from '@solana/kit';

vi.mock(import('@solana-program/token-2022'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		identifyToken2022Instruction: vi.fn(),
		parseAmountToUiAmountInstruction: vi.fn(),
		parseApplyConfidentialPendingBalanceInstruction: vi.fn(),
		parseApproveCheckedInstruction: vi.fn(),
		parseApproveConfidentialTransferAccountInstruction: vi.fn(),
		parseApproveInstruction: vi.fn(),
		parseBurnCheckedInstruction: vi.fn(),
		parseBurnInstruction: vi.fn(),
		parseCloseAccountInstruction: vi.fn(),
		parseConfidentialDepositInstruction: vi.fn(),
		parseConfidentialTransferInstruction: vi.fn(),
		parseConfidentialTransferWithFeeInstruction: vi.fn(),
		parseConfidentialWithdrawInstruction: vi.fn(),
		parseConfigureConfidentialTransferAccountInstruction: vi.fn(),
		parseCreateNativeMintInstruction: vi.fn(),
		parseDisableConfidentialCreditsInstruction: vi.fn(),
		parseDisableCpiGuardInstruction: vi.fn(),
		parseDisableHarvestToMintInstruction: vi.fn(),
		parseDisableMemoTransfersInstruction: vi.fn(),
		parseDisableNonConfidentialCreditsInstruction: vi.fn(),
		parseEmitTokenMetadataInstruction: vi.fn(),
		parseEmptyConfidentialTransferAccountInstruction: vi.fn(),
		parseEnableConfidentialCreditsInstruction: vi.fn(),
		parseEnableCpiGuardInstruction: vi.fn(),
		parseEnableHarvestToMintInstruction: vi.fn(),
		parseEnableMemoTransfersInstruction: vi.fn(),
		parseEnableNonConfidentialCreditsInstruction: vi.fn(),
		parseFreezeAccountInstruction: vi.fn(),
		parseGetAccountDataSizeInstruction: vi.fn(),
		parseHarvestWithheldTokensToMintForConfidentialTransferFeeInstruction: vi.fn(),
		parseHarvestWithheldTokensToMintInstruction: vi.fn(),
		parseInitializeAccount2Instruction: vi.fn(),
		parseInitializeAccount3Instruction: vi.fn(),
		parseInitializeAccountInstruction: vi.fn(),
		parseInitializeConfidentialTransferFeeInstruction: vi.fn(),
		parseInitializeConfidentialTransferMintInstruction: vi.fn(),
		parseInitializeDefaultAccountStateInstruction: vi.fn(),
		parseInitializeGroupMemberPointerInstruction: vi.fn(),
		parseInitializeGroupPointerInstruction: vi.fn(),
		parseInitializeImmutableOwnerInstruction: vi.fn(),
		parseInitializeInterestBearingMintInstruction: vi.fn(),
		parseInitializeMetadataPointerInstruction: vi.fn(),
		parseInitializeMint2Instruction: vi.fn(),
		parseInitializeMintCloseAuthorityInstruction: vi.fn(),
		parseInitializeMintInstruction: vi.fn(),
		parseInitializeMultisig2Instruction: vi.fn(),
		parseInitializeMultisigInstruction: vi.fn(),
		parseInitializeNonTransferableMintInstruction: vi.fn(),
		parseInitializePausableConfigInstruction: vi.fn(),
		parseInitializePermanentDelegateInstruction: vi.fn(),
		parseInitializeScaledUiAmountMintInstruction: vi.fn(),
		parseInitializeTokenGroupInstruction: vi.fn(),
		parseInitializeTokenGroupMemberInstruction: vi.fn(),
		parseInitializeTokenMetadataInstruction: vi.fn(),
		parseInitializeTransferFeeConfigInstruction: vi.fn(),
		parseInitializeTransferHookInstruction: vi.fn(),
		parseMintToCheckedInstruction: vi.fn(),
		parseMintToInstruction: vi.fn(),
		parsePauseInstruction: vi.fn(),
		parseReallocateInstruction: vi.fn(),
		parseRemoveTokenMetadataKeyInstruction: vi.fn(),
		parseResumeInstruction: vi.fn(),
		parseRevokeInstruction: vi.fn(),
		parseSetAuthorityInstruction: vi.fn(),
		parseSetTransferFeeInstruction: vi.fn(),
		parseSyncNativeInstruction: vi.fn(),
		parseThawAccountInstruction: vi.fn(),
		parseTransferCheckedInstruction: vi.fn(),
		parseTransferCheckedWithFeeInstruction: vi.fn(),
		parseTransferInstruction: vi.fn(),
		parseUiAmountToAmountInstruction: vi.fn(),
		parseUpdateConfidentialTransferMintInstruction: vi.fn(),
		parseUpdateDefaultAccountStateInstruction: vi.fn(),
		parseUpdateGroupMemberPointerInstruction: vi.fn(),
		parseUpdateGroupPointerInstruction: vi.fn(),
		parseUpdateMetadataPointerInstruction: vi.fn(),
		parseUpdateMultiplierScaledUiMintInstruction: vi.fn(),
		parseUpdateRateInterestBearingMintInstruction: vi.fn(),
		parseUpdateTokenGroupMaxSizeInstruction: vi.fn(),
		parseUpdateTokenGroupUpdateAuthorityInstruction: vi.fn(),
		parseUpdateTokenMetadataFieldInstruction: vi.fn(),
		parseUpdateTokenMetadataUpdateAuthorityInstruction: vi.fn(),
		parseUpdateTransferHookInstruction: vi.fn(),
		parseWithdrawExcessLamportsInstruction: vi.fn(),
		parseWithdrawWithheldTokensFromAccountsForConfidentialTransferFeeInstruction: vi.fn(),
		parseWithdrawWithheldTokensFromAccountsInstruction: vi.fn(),
		parseWithdrawWithheldTokensFromMintForConfidentialTransferFeeInstruction: vi.fn(),
		parseWithdrawWithheldTokensFromMintInstruction: vi.fn()
	};
});

describe('sol-instructions-token-2022.utils', () => {
	describe('parseSolToken2022Instruction', () => {
		const mockInstruction: SolInstruction = {
			accounts: [{ address: address(mockSolAddress), role: 3 }],
			data: new Uint8Array([1, 2, 3]),
			programAddress: address(mockSolAddress)
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should raise an error if the instruction is missing the data', () => {
			const { data: _, ...withoutData } = mockInstruction;

			expect(() => parseSolToken2022Instruction(withoutData)).toThrow(
				'The instruction does not have any data'
			);
		});

		it('should raise an error if the instruction is missing the accounts', () => {
			const { accounts: _, ...withoutAccounts } = mockInstruction;

			expect(() =>
				parseSolToken2022Instruction(withoutAccounts as unknown as SolInstruction)
			).toThrow('The instruction does not have any accounts');
		});

		it('should parse an InitializeMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.InitializeMint);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeMint
			});

			expect(parseInitializeMintInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeAccount instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeAccount
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeAccount
			});

			expect(parseInitializeAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeMultisig instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeMultisig
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeMultisig
			});

			expect(parseInitializeMultisigInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a Transfer instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.Transfer);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.Transfer
			});

			expect(parseTransferInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an Approve instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.Approve);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.Approve
			});

			expect(parseApproveInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a Revoke instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.Revoke);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.Revoke
			});

			expect(parseRevokeInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a SetAuthority instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.SetAuthority);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.SetAuthority
			});

			expect(parseSetAuthorityInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a MintTo instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.MintTo);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.MintTo
			});

			expect(parseMintToInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a Burn instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.Burn);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.Burn
			});

			expect(parseBurnInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a CloseAccount instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.CloseAccount);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.CloseAccount
			});

			expect(parseCloseAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a FreezeAccount instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.FreezeAccount);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.FreezeAccount
			});

			expect(parseFreezeAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a ThawAccount instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.ThawAccount);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.ThawAccount
			});

			expect(parseThawAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a TransferChecked instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.TransferChecked);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.TransferChecked
			});

			expect(parseTransferCheckedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an ApproveChecked instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.ApproveChecked);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.ApproveChecked
			});

			expect(parseApproveCheckedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a MintToChecked instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.MintToChecked);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.MintToChecked
			});

			expect(parseMintToCheckedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a BurnChecked instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.BurnChecked);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.BurnChecked
			});

			expect(parseBurnCheckedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeAccount2 instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeAccount2
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeAccount2
			});

			expect(parseInitializeAccount2Instruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a SyncNative instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.SyncNative);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.SyncNative
			});

			expect(parseSyncNativeInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeAccount3 instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeAccount3
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeAccount3
			});

			expect(parseInitializeAccount3Instruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeMultisig2 instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeMultisig2
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeMultisig2
			});

			expect(parseInitializeMultisig2Instruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeMint2 instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.InitializeMint2);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeMint2
			});

			expect(parseInitializeMint2Instruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a GetAccountDataSize instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.GetAccountDataSize
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.GetAccountDataSize
			});

			expect(parseGetAccountDataSizeInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeImmutableOwner instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeImmutableOwner
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeImmutableOwner
			});

			expect(parseInitializeImmutableOwnerInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an AmountToUiAmount instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.AmountToUiAmount
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.AmountToUiAmount
			});

			expect(parseAmountToUiAmountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a UiAmountToAmount instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UiAmountToAmount
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UiAmountToAmount
			});

			expect(parseUiAmountToAmountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeMintCloseAuthority instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeMintCloseAuthority
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeMintCloseAuthority
			});

			expect(parseInitializeMintCloseAuthorityInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an InitializeTransferFeeConfig instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeTransferFeeConfig
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeTransferFeeConfig
			});

			expect(parseInitializeTransferFeeConfigInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a TransferCheckedWithFee instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.TransferCheckedWithFee
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.TransferCheckedWithFee
			});

			expect(parseTransferCheckedWithFeeInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a WithdrawWithheldTokensFromMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.WithdrawWithheldTokensFromMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.WithdrawWithheldTokensFromMint
			});

			expect(parseWithdrawWithheldTokensFromMintInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a WithdrawWithheldTokensFromAccounts instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.WithdrawWithheldTokensFromAccounts
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.WithdrawWithheldTokensFromAccounts
			});

			expect(parseWithdrawWithheldTokensFromAccountsInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a HarvestWithheldTokensToMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.HarvestWithheldTokensToMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.HarvestWithheldTokensToMint
			});

			expect(parseHarvestWithheldTokensToMintInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a SetTransferFee instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.SetTransferFee);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.SetTransferFee
			});

			expect(parseSetTransferFeeInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeConfidentialTransferMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeConfidentialTransferMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeConfidentialTransferMint
			});

			expect(parseInitializeConfidentialTransferMintInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateConfidentialTransferMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateConfidentialTransferMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateConfidentialTransferMint
			});

			expect(parseUpdateConfidentialTransferMintInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a ConfigureConfidentialTransferAccount instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.ConfigureConfidentialTransferAccount
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.ConfigureConfidentialTransferAccount
			});

			expect(parseConfigureConfidentialTransferAccountInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an ApproveConfidentialTransferAccount instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.ApproveConfidentialTransferAccount
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.ApproveConfidentialTransferAccount
			});

			expect(parseApproveConfidentialTransferAccountInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an EmptyConfidentialTransferAccount instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.EmptyConfidentialTransferAccount
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.EmptyConfidentialTransferAccount
			});

			expect(parseEmptyConfidentialTransferAccountInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a ConfidentialDeposit instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.ConfidentialDeposit
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.ConfidentialDeposit
			});

			expect(parseConfidentialDepositInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a ConfidentialWithdraw instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.ConfidentialWithdraw
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.ConfidentialWithdraw
			});

			expect(parseConfidentialWithdrawInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a ConfidentialTransfer instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.ConfidentialTransfer
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.ConfidentialTransfer
			});

			expect(parseConfidentialTransferInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an ApplyConfidentialPendingBalance instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.ApplyConfidentialPendingBalance
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.ApplyConfidentialPendingBalance
			});

			expect(parseApplyConfidentialPendingBalanceInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an EnableConfidentialCredits instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.EnableConfidentialCredits
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.EnableConfidentialCredits
			});

			expect(parseEnableConfidentialCreditsInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a DisableConfidentialCredits instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.DisableConfidentialCredits
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.DisableConfidentialCredits
			});

			expect(parseDisableConfidentialCreditsInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an EnableNonConfidentialCredits instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.EnableNonConfidentialCredits
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.EnableNonConfidentialCredits
			});

			expect(parseEnableNonConfidentialCreditsInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a DisableNonConfidentialCredits instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.DisableNonConfidentialCredits
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.DisableNonConfidentialCredits
			});

			expect(parseDisableNonConfidentialCreditsInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a ConfidentialTransferWithFee instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.ConfidentialTransferWithFee
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.ConfidentialTransferWithFee
			});

			expect(parseConfidentialTransferWithFeeInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an InitializeDefaultAccountState instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeDefaultAccountState
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeDefaultAccountState
			});

			expect(parseInitializeDefaultAccountStateInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateDefaultAccountState instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateDefaultAccountState
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateDefaultAccountState
			});

			expect(parseUpdateDefaultAccountStateInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a Reallocate instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.Reallocate);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.Reallocate
			});

			expect(parseReallocateInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an EnableMemoTransfers instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.EnableMemoTransfers
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.EnableMemoTransfers
			});

			expect(parseEnableMemoTransfersInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a DisableMemoTransfers instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.DisableMemoTransfers
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.DisableMemoTransfers
			});

			expect(parseDisableMemoTransfersInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a CreateNativeMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.CreateNativeMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.CreateNativeMint
			});

			expect(parseCreateNativeMintInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeNonTransferableMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeNonTransferableMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeNonTransferableMint
			});

			expect(parseInitializeNonTransferableMintInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an InitializeInterestBearingMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeInterestBearingMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeInterestBearingMint
			});

			expect(parseInitializeInterestBearingMintInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateRateInterestBearingMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateRateInterestBearingMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateRateInterestBearingMint
			});

			expect(parseUpdateRateInterestBearingMintInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an EnableCpiGuard instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.EnableCpiGuard);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.EnableCpiGuard
			});

			expect(parseEnableCpiGuardInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a DisableCpiGuard instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.DisableCpiGuard);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.DisableCpiGuard
			});

			expect(parseDisableCpiGuardInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializePermanentDelegate instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializePermanentDelegate
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializePermanentDelegate
			});

			expect(parseInitializePermanentDelegateInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an InitializeTransferHook instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeTransferHook
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeTransferHook
			});

			expect(parseInitializeTransferHookInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateTransferHook instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateTransferHook
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateTransferHook
			});

			expect(parseUpdateTransferHookInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeConfidentialTransferFee instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeConfidentialTransferFee
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeConfidentialTransferFee
			});

			expect(parseInitializeConfidentialTransferFeeInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a WithdrawWithheldTokensFromMintForConfidentialTransferFee instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.WithdrawWithheldTokensFromMintForConfidentialTransferFee
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType:
					Token2022Instruction.WithdrawWithheldTokensFromMintForConfidentialTransferFee
			});

			expect(
				parseWithdrawWithheldTokensFromMintForConfidentialTransferFeeInstruction
			).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a WithdrawWithheldTokensFromAccountsForConfidentialTransferFee instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.WithdrawWithheldTokensFromAccountsForConfidentialTransferFee
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType:
					Token2022Instruction.WithdrawWithheldTokensFromAccountsForConfidentialTransferFee
			});

			expect(
				parseWithdrawWithheldTokensFromAccountsForConfidentialTransferFeeInstruction
			).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a HarvestWithheldTokensToMintForConfidentialTransferFee instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.HarvestWithheldTokensToMintForConfidentialTransferFee
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.HarvestWithheldTokensToMintForConfidentialTransferFee
			});

			expect(
				parseHarvestWithheldTokensToMintForConfidentialTransferFeeInstruction
			).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an EnableHarvestToMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.EnableHarvestToMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.EnableHarvestToMint
			});

			expect(parseEnableHarvestToMintInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a DisableHarvestToMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.DisableHarvestToMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.DisableHarvestToMint
			});

			expect(parseDisableHarvestToMintInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a WithdrawExcessLamports instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.WithdrawExcessLamports
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.WithdrawExcessLamports
			});

			expect(parseWithdrawExcessLamportsInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an InitializeMetadataPointer instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeMetadataPointer
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeMetadataPointer
			});

			expect(parseInitializeMetadataPointerInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateMetadataPointer instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateMetadataPointer
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateMetadataPointer
			});

			expect(parseUpdateMetadataPointerInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an InitializeGroupPointer instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeGroupPointer
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeGroupPointer
			});

			expect(parseInitializeGroupPointerInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateGroupPointer instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateGroupPointer
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateGroupPointer
			});

			expect(parseUpdateGroupPointerInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeGroupMemberPointer instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeGroupMemberPointer
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeGroupMemberPointer
			});

			expect(parseInitializeGroupMemberPointerInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateGroupMemberPointer instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateGroupMemberPointer
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateGroupMemberPointer
			});

			expect(parseUpdateGroupMemberPointerInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an InitializeScaledUiAmountMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeScaledUiAmountMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeScaledUiAmountMint
			});

			expect(parseInitializeScaledUiAmountMintInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateMultiplierScaledUiMint instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateMultiplierScaledUiMint
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateMultiplierScaledUiMint
			});

			expect(parseUpdateMultiplierScaledUiMintInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an InitializePausableConfig instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializePausableConfig
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializePausableConfig
			});

			expect(parseInitializePausableConfigInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a Pause instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.Pause);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.Pause
			});

			expect(parsePauseInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a Resume instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(Token2022Instruction.Resume);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.Resume
			});

			expect(parseResumeInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeTokenMetadata instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeTokenMetadata
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeTokenMetadata
			});

			expect(parseInitializeTokenMetadataInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateTokenMetadataField instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateTokenMetadataField
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateTokenMetadataField
			});

			expect(parseUpdateTokenMetadataFieldInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a RemoveTokenMetadataKey instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.RemoveTokenMetadataKey
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.RemoveTokenMetadataKey
			});

			expect(parseRemoveTokenMetadataKeyInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateTokenMetadataUpdateAuthority instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateTokenMetadataUpdateAuthority
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateTokenMetadataUpdateAuthority
			});

			expect(parseUpdateTokenMetadataUpdateAuthorityInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an EmitTokenMetadata instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.EmitTokenMetadata
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.EmitTokenMetadata
			});

			expect(parseEmitTokenMetadataInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeTokenGroup instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeTokenGroup
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeTokenGroup
			});

			expect(parseInitializeTokenGroupInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an UpdateTokenGroupMaxSize instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateTokenGroupMaxSize
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateTokenGroupMaxSize
			});

			expect(parseUpdateTokenGroupMaxSizeInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an UpdateTokenGroupUpdateAuthority instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.UpdateTokenGroupUpdateAuthority
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.UpdateTokenGroupUpdateAuthority
			});

			expect(parseUpdateTokenGroupUpdateAuthorityInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an InitializeTokenGroupMember instruction', () => {
			vi.mocked(identifyToken2022Instruction).mockReturnValue(
				Token2022Instruction.InitializeTokenGroupMember
			);

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual({
				instructionType: Token2022Instruction.InitializeTokenGroupMember
			});

			expect(parseInitializeTokenGroupMemberInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should return the original instruction if it is not a recognised Token-2022 instruction', () => {
			// @ts-expect-error intentional for testing unknown discriminant
			vi.mocked(identifyToken2022Instruction).mockReturnValue('unknown-instruction');

			expect(parseSolToken2022Instruction(mockInstruction)).toStrictEqual(mockInstruction);

			expect(parseInitializeMintInstruction).not.toHaveBeenCalled();
			expect(parseInitializeAccountInstruction).not.toHaveBeenCalled();
			expect(parseInitializeMultisigInstruction).not.toHaveBeenCalled();
			expect(parseTransferInstruction).not.toHaveBeenCalled();
			expect(parseApproveInstruction).not.toHaveBeenCalled();
			expect(parseRevokeInstruction).not.toHaveBeenCalled();
			expect(parseSetAuthorityInstruction).not.toHaveBeenCalled();
			expect(parseMintToInstruction).not.toHaveBeenCalled();
			expect(parseBurnInstruction).not.toHaveBeenCalled();
			expect(parseCloseAccountInstruction).not.toHaveBeenCalled();
			expect(parseFreezeAccountInstruction).not.toHaveBeenCalled();
			expect(parseThawAccountInstruction).not.toHaveBeenCalled();
			expect(parseTransferCheckedInstruction).not.toHaveBeenCalled();
			expect(parseApproveCheckedInstruction).not.toHaveBeenCalled();
			expect(parseMintToCheckedInstruction).not.toHaveBeenCalled();
			expect(parseBurnCheckedInstruction).not.toHaveBeenCalled();
			expect(parseInitializeAccount2Instruction).not.toHaveBeenCalled();
			expect(parseSyncNativeInstruction).not.toHaveBeenCalled();
			expect(parseInitializeAccount3Instruction).not.toHaveBeenCalled();
			expect(parseInitializeMultisig2Instruction).not.toHaveBeenCalled();
			expect(parseInitializeMint2Instruction).not.toHaveBeenCalled();
			expect(parseGetAccountDataSizeInstruction).not.toHaveBeenCalled();
			expect(parseInitializeImmutableOwnerInstruction).not.toHaveBeenCalled();
			expect(parseAmountToUiAmountInstruction).not.toHaveBeenCalled();
			expect(parseUiAmountToAmountInstruction).not.toHaveBeenCalled();
			expect(parseInitializeMintCloseAuthorityInstruction).not.toHaveBeenCalled();
			expect(parseInitializeTransferFeeConfigInstruction).not.toHaveBeenCalled();
			expect(parseTransferCheckedWithFeeInstruction).not.toHaveBeenCalled();
			expect(parseWithdrawWithheldTokensFromMintInstruction).not.toHaveBeenCalled();
			expect(parseWithdrawWithheldTokensFromAccountsInstruction).not.toHaveBeenCalled();
			expect(parseHarvestWithheldTokensToMintInstruction).not.toHaveBeenCalled();
			expect(parseSetTransferFeeInstruction).not.toHaveBeenCalled();
			expect(parseInitializeConfidentialTransferMintInstruction).not.toHaveBeenCalled();
			expect(parseUpdateConfidentialTransferMintInstruction).not.toHaveBeenCalled();
			expect(parseConfigureConfidentialTransferAccountInstruction).not.toHaveBeenCalled();
			expect(parseApproveConfidentialTransferAccountInstruction).not.toHaveBeenCalled();
			expect(parseEmptyConfidentialTransferAccountInstruction).not.toHaveBeenCalled();
			expect(parseConfidentialDepositInstruction).not.toHaveBeenCalled();
			expect(parseConfidentialWithdrawInstruction).not.toHaveBeenCalled();
			expect(parseConfidentialTransferInstruction).not.toHaveBeenCalled();
			expect(parseApplyConfidentialPendingBalanceInstruction).not.toHaveBeenCalled();
			expect(parseEnableConfidentialCreditsInstruction).not.toHaveBeenCalled();
			expect(parseDisableConfidentialCreditsInstruction).not.toHaveBeenCalled();
			expect(parseEnableNonConfidentialCreditsInstruction).not.toHaveBeenCalled();
			expect(parseDisableNonConfidentialCreditsInstruction).not.toHaveBeenCalled();
			expect(parseInitializeDefaultAccountStateInstruction).not.toHaveBeenCalled();
			expect(parseUpdateDefaultAccountStateInstruction).not.toHaveBeenCalled();
			expect(parseReallocateInstruction).not.toHaveBeenCalled();
			expect(parseEnableMemoTransfersInstruction).not.toHaveBeenCalled();
			expect(parseDisableMemoTransfersInstruction).not.toHaveBeenCalled();
			expect(parseCreateNativeMintInstruction).not.toHaveBeenCalled();
			expect(parseInitializeNonTransferableMintInstruction).not.toHaveBeenCalled();
			expect(parseInitializeInterestBearingMintInstruction).not.toHaveBeenCalled();
			expect(parseUpdateRateInterestBearingMintInstruction).not.toHaveBeenCalled();
			expect(parseEnableCpiGuardInstruction).not.toHaveBeenCalled();
			expect(parseDisableCpiGuardInstruction).not.toHaveBeenCalled();
			expect(parseInitializePermanentDelegateInstruction).not.toHaveBeenCalled();
			expect(parseInitializeTransferHookInstruction).not.toHaveBeenCalled();
			expect(parseUpdateTransferHookInstruction).not.toHaveBeenCalled();
			expect(parseInitializeConfidentialTransferFeeInstruction).not.toHaveBeenCalled();
			expect(
				parseWithdrawWithheldTokensFromMintForConfidentialTransferFeeInstruction
			).not.toHaveBeenCalled();
			expect(
				parseWithdrawWithheldTokensFromAccountsForConfidentialTransferFeeInstruction
			).not.toHaveBeenCalled();
			expect(
				parseHarvestWithheldTokensToMintForConfidentialTransferFeeInstruction
			).not.toHaveBeenCalled();
			expect(parseEnableHarvestToMintInstruction).not.toHaveBeenCalled();
			expect(parseDisableHarvestToMintInstruction).not.toHaveBeenCalled();
			expect(parseWithdrawExcessLamportsInstruction).not.toHaveBeenCalled();
			expect(parseInitializeMetadataPointerInstruction).not.toHaveBeenCalled();
			expect(parseUpdateMetadataPointerInstruction).not.toHaveBeenCalled();
			expect(parseInitializeGroupPointerInstruction).not.toHaveBeenCalled();
			expect(parseUpdateGroupPointerInstruction).not.toHaveBeenCalled();
			expect(parseInitializeGroupMemberPointerInstruction).not.toHaveBeenCalled();
			expect(parseUpdateGroupMemberPointerInstruction).not.toHaveBeenCalled();
			expect(parseInitializeScaledUiAmountMintInstruction).not.toHaveBeenCalled();
			expect(parseUpdateMultiplierScaledUiMintInstruction).not.toHaveBeenCalled();
			expect(parseInitializePausableConfigInstruction).not.toHaveBeenCalled();
			expect(parsePauseInstruction).not.toHaveBeenCalled();
			expect(parseResumeInstruction).not.toHaveBeenCalled();
			expect(parseInitializeTokenMetadataInstruction).not.toHaveBeenCalled();
			expect(parseUpdateTokenMetadataFieldInstruction).not.toHaveBeenCalled();
			expect(parseRemoveTokenMetadataKeyInstruction).not.toHaveBeenCalled();
			expect(parseUpdateTokenMetadataUpdateAuthorityInstruction).not.toHaveBeenCalled();
			expect(parseEmitTokenMetadataInstruction).not.toHaveBeenCalled();
			expect(parseInitializeTokenGroupInstruction).not.toHaveBeenCalled();
			expect(parseUpdateTokenGroupMaxSizeInstruction).not.toHaveBeenCalled();
			expect(parseUpdateTokenGroupUpdateAuthorityInstruction).not.toHaveBeenCalled();
			expect(parseInitializeTokenGroupMemberInstruction).not.toHaveBeenCalled();
		});
	});
});
