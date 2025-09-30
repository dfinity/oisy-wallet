import { TOKEN_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolInstruction } from '$sol/types/sol-instructions';
import { parseSolTokenInstruction } from '$sol/utils/sol-instructions-token.utils';
import { mockSolAddress } from '$tests/mocks/sol.mock';
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
import { address } from '@solana/kit';

vi.mock(import('@solana-program/token'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		identifyTokenInstruction: vi.fn(),
		parseAmountToUiAmountInstruction: vi.fn(),
		parseApproveCheckedInstruction: vi.fn(),
		parseApproveInstruction: vi.fn(),
		parseBurnCheckedInstruction: vi.fn(),
		parseBurnInstruction: vi.fn(),
		parseCloseAccountInstruction: vi.fn(),
		parseFreezeAccountInstruction: vi.fn(),
		parseGetAccountDataSizeInstruction: vi.fn(),
		parseInitializeAccount2Instruction: vi.fn(),
		parseInitializeAccount3Instruction: vi.fn(),
		parseInitializeAccountInstruction: vi.fn(),
		parseInitializeImmutableOwnerInstruction: vi.fn(),
		parseInitializeMint2Instruction: vi.fn(),
		parseInitializeMintInstruction: vi.fn(),
		parseInitializeMultisig2Instruction: vi.fn(),
		parseInitializeMultisigInstruction: vi.fn(),
		parseMintToCheckedInstruction: vi.fn(),
		parseMintToInstruction: vi.fn(),
		parseRevokeInstruction: vi.fn(),
		parseSetAuthorityInstruction: vi.fn(),
		parseSyncNativeInstruction: vi.fn(),
		parseThawAccountInstruction: vi.fn(),
		parseTransferCheckedInstruction: vi.fn(),
		parseTransferInstruction: vi.fn(),
		parseUiAmountToAmountInstruction: vi.fn()
	};
});

describe('sol-instructions-token.utils', () => {
	describe('parseSolTokenInstruction', () => {
		const mockInstruction: SolInstruction = {
			accounts: [{ address: address(mockSolAddress), role: 3 }],
			data: new Uint8Array([1, 2, 3]),
			programAddress: address(TOKEN_PROGRAM_ADDRESS)
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should raise an error if the instruction is missing the data', () => {
			const { data: _, ...withoutData } = mockInstruction;

			expect(() => parseSolTokenInstruction(withoutData)).toThrow(
				'The instruction does not have any data'
			);
		});

		it('should raise an error if the instruction is missing the accounts', () => {
			const { accounts: _, ...withoutAccounts } = mockInstruction;

			expect(() => parseSolTokenInstruction(withoutAccounts as unknown as SolInstruction)).toThrow(
				'The instruction does not have any accounts'
			);
		});

		it('should parse an InitializeMint instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.InitializeMint);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.InitializeMint
			});

			expect(parseInitializeMintInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeAccount instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.InitializeAccount);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.InitializeAccount
			});

			expect(parseInitializeAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeMultisig instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.InitializeMultisig);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.InitializeMultisig
			});

			expect(parseInitializeMultisigInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a Transfer instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.Transfer);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.Transfer
			});

			expect(parseTransferInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an Approve instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.Approve);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.Approve
			});

			expect(parseApproveInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a Revoke instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.Revoke);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.Revoke
			});

			expect(parseRevokeInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a SetAuthority instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.SetAuthority);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.SetAuthority
			});

			expect(parseSetAuthorityInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a MintTo instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.MintTo);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.MintTo
			});

			expect(parseMintToInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a Burn instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.Burn);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.Burn
			});

			expect(parseBurnInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a CloseAccount instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.CloseAccount);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.CloseAccount
			});

			expect(parseCloseAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a FreezeAccount instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.FreezeAccount);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.FreezeAccount
			});

			expect(parseFreezeAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a ThawAccount instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.ThawAccount);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.ThawAccount
			});

			expect(parseThawAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a TransferChecked instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.TransferChecked);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.TransferChecked
			});

			expect(parseTransferCheckedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an ApproveChecked instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.ApproveChecked);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.ApproveChecked
			});

			expect(parseApproveCheckedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a MintToChecked instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.MintToChecked);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.MintToChecked
			});

			expect(parseMintToCheckedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a BurnChecked instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.BurnChecked);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.BurnChecked
			});

			expect(parseBurnCheckedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeAccount2 instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.InitializeAccount2);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.InitializeAccount2
			});

			expect(parseInitializeAccount2Instruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a SyncNative instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.SyncNative);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.SyncNative
			});

			expect(parseSyncNativeInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeAccount3 instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.InitializeAccount3);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.InitializeAccount3
			});

			expect(parseInitializeAccount3Instruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeMultisig2 instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.InitializeMultisig2);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.InitializeMultisig2
			});

			expect(parseInitializeMultisig2Instruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeMint2 instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.InitializeMint2);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.InitializeMint2
			});

			expect(parseInitializeMint2Instruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a GetAccountDataSize instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.GetAccountDataSize);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.GetAccountDataSize
			});

			expect(parseGetAccountDataSizeInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeImmutableOwner instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(
				TokenInstruction.InitializeImmutableOwner
			);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.InitializeImmutableOwner
			});

			expect(parseInitializeImmutableOwnerInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an AmountToUiAmount instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.AmountToUiAmount);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.AmountToUiAmount
			});

			expect(parseAmountToUiAmountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a UiAmountToAmount instruction', () => {
			vi.mocked(identifyTokenInstruction).mockReturnValue(TokenInstruction.UiAmountToAmount);

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual({
				instructionType: TokenInstruction.UiAmountToAmount
			});

			expect(parseUiAmountToAmountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should return the original instruction if it is not a recognised Token instruction', () => {
			// @ts-expect-error intentional for testing unknown discriminant
			vi.mocked(identifyTokenInstruction).mockReturnValue('unknown-instruction');

			expect(parseSolTokenInstruction(mockInstruction)).toStrictEqual(mockInstruction);

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
		});
	});
});
