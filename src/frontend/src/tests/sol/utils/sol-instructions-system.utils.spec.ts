import { SYSTEM_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolInstruction } from '$sol/types/sol-instructions';
import { parseSolSystemInstruction } from '$sol/utils/sol-instructions-system.utils';
import { mockSolAddress } from '$tests/mocks/sol.mock';
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
import { address } from '@solana/kit';

vi.mock(import('@solana-program/system'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		identifySystemInstruction: vi.fn(),
		parseAdvanceNonceAccountInstruction: vi.fn(),
		parseAllocateInstruction: vi.fn(),
		parseAllocateWithSeedInstruction: vi.fn(),
		parseAssignInstruction: vi.fn(),
		parseAssignWithSeedInstruction: vi.fn(),
		parseAuthorizeNonceAccountInstruction: vi.fn(),
		parseCreateAccountInstruction: vi.fn(),
		parseCreateAccountWithSeedInstruction: vi.fn(),
		parseInitializeNonceAccountInstruction: vi.fn(),
		parseTransferSolInstruction: vi.fn(),
		parseTransferSolWithSeedInstruction: vi.fn(),
		parseUpgradeNonceAccountInstruction: vi.fn(),
		parseWithdrawNonceAccountInstruction: vi.fn()
	};
});

describe('sol-instructions-system.utils', () => {
	describe('parseSolSystemInstruction', () => {
		const mockInstruction: SolInstruction = {
			accounts: [{ address: address(mockSolAddress), role: 3 }],
			data: new Uint8Array([1, 2, 3]),
			programAddress: address(SYSTEM_PROGRAM_ADDRESS)
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should raise an error if the instruction is missing the data', () => {
			const { data: _, ...withoutData } = mockInstruction;

			expect(() => parseSolSystemInstruction(withoutData)).toThrow(
				'The instruction does not have any data'
			);
		});

		it('should raise an error if the instruction is missing the accounts', () => {
			const { accounts: _, ...withoutAccounts } = mockInstruction;

			expect(() => parseSolSystemInstruction(withoutAccounts as unknown as SolInstruction)).toThrow(
				'The instruction does not have any accounts'
			);
		});

		it('should parse a CreateAccount instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.CreateAccount);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.CreateAccount
			});

			expect(parseCreateAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an Assign instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.Assign);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.Assign
			});

			expect(parseAssignInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a TransferSol instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.TransferSol);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.TransferSol
			});

			expect(parseTransferSolInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a CreateAccountWithSeed instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.CreateAccountWithSeed);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.CreateAccountWithSeed
			});

			expect(parseCreateAccountWithSeedInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an AdvanceNonceAccount instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.AdvanceNonceAccount);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.AdvanceNonceAccount
			});

			expect(parseAdvanceNonceAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a WithdrawNonceAccount instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.WithdrawNonceAccount);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.WithdrawNonceAccount
			});

			expect(parseWithdrawNonceAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an InitializeNonceAccount instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(
				SystemInstruction.InitializeNonceAccount
			);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.InitializeNonceAccount
			});

			expect(parseInitializeNonceAccountInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an AuthorizeNonceAccount instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.AuthorizeNonceAccount);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.AuthorizeNonceAccount
			});

			expect(parseAuthorizeNonceAccountInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse an Allocate instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.Allocate);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.Allocate
			});

			expect(parseAllocateInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an AllocateWithSeed instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.AllocateWithSeed);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.AllocateWithSeed
			});

			expect(parseAllocateWithSeedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an AssignWithSeed instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.AssignWithSeed);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.AssignWithSeed
			});

			expect(parseAssignWithSeedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a TransferSolWithSeed instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.TransferSolWithSeed);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.TransferSolWithSeed
			});

			expect(parseTransferSolWithSeedInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse an UpgradeNonceAccount instruction', () => {
			vi.mocked(identifySystemInstruction).mockReturnValue(SystemInstruction.UpgradeNonceAccount);

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual({
				instructionType: SystemInstruction.UpgradeNonceAccount
			});

			expect(parseUpgradeNonceAccountInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should return the original instruction if it is not a recognised System instruction', () => {
			// @ts-expect-error intentional for testing unknown discriminant
			vi.mocked(identifySystemInstruction).mockReturnValue('unknown-instruction');

			expect(parseSolSystemInstruction(mockInstruction)).toStrictEqual(mockInstruction);

			expect(parseCreateAccountInstruction).not.toHaveBeenCalled();
			expect(parseAssignInstruction).not.toHaveBeenCalled();
			expect(parseTransferSolInstruction).not.toHaveBeenCalled();
			expect(parseCreateAccountWithSeedInstruction).not.toHaveBeenCalled();
			expect(parseAdvanceNonceAccountInstruction).not.toHaveBeenCalled();
			expect(parseWithdrawNonceAccountInstruction).not.toHaveBeenCalled();
			expect(parseInitializeNonceAccountInstruction).not.toHaveBeenCalled();
			expect(parseAuthorizeNonceAccountInstruction).not.toHaveBeenCalled();
			expect(parseAllocateInstruction).not.toHaveBeenCalled();
			expect(parseAllocateWithSeedInstruction).not.toHaveBeenCalled();
			expect(parseAssignWithSeedInstruction).not.toHaveBeenCalled();
			expect(parseTransferSolWithSeedInstruction).not.toHaveBeenCalled();
			expect(parseUpgradeNonceAccountInstruction).not.toHaveBeenCalled();
		});
	});
});
