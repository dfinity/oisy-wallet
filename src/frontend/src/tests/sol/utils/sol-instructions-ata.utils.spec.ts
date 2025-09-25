import { ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolInstruction } from '$sol/types/sol-instructions';
import { parseSolAtaInstruction } from '$sol/utils/sol-instructions-ata.utils';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import {
	AssociatedTokenInstruction,
	identifyAssociatedTokenInstruction,
	parseCreateAssociatedTokenIdempotentInstruction,
	parseCreateAssociatedTokenInstruction,
	parseRecoverNestedAssociatedTokenInstruction
} from '@solana-program/token';
import { address } from '@solana/kit';

vi.mock(import('@solana-program/token'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		identifyAssociatedTokenInstruction: vi.fn(),
		parseCreateAssociatedTokenInstruction: vi.fn(),
		parseCreateAssociatedTokenIdempotentInstruction: vi.fn(),
		parseRecoverNestedAssociatedTokenInstruction: vi.fn()
	};
});

describe('sol-instructions-ata.utils', () => {
	describe('parseSolAtaInstruction', () => {
		const mockInstruction: SolInstruction = {
			accounts: [{ address: address(mockSolAddress), role: 3 }],
			data: new Uint8Array([1, 2, 3]),
			programAddress: address(ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ADDRESS)
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should raise an error if the instruction is missing the data', () => {
			const { data: _, ...withoutData } = mockInstruction;

			expect(() => parseSolAtaInstruction(withoutData)).toThrow(
				'The instruction does not have any data'
			);
		});

		it('should raise an error if the instruction is missing the accounts', () => {
			const { accounts: _, ...withoutAccounts } = mockInstruction;

			expect(() => parseSolAtaInstruction(withoutAccounts)).toThrow(
				'The instruction does not have any accounts'
			);
		});

		it('should parse a CreateAssociatedToken instruction', () => {
			vi.mocked(identifyAssociatedTokenInstruction).mockReturnValue(
				AssociatedTokenInstruction.CreateAssociatedToken
			);

			expect(parseSolAtaInstruction(mockInstruction)).toStrictEqual({
				instructionType: AssociatedTokenInstruction.CreateAssociatedToken
			});

			expect(parseCreateAssociatedTokenInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a CreateAssociatedTokenIdempotent instruction', () => {
			vi.mocked(identifyAssociatedTokenInstruction).mockReturnValue(
				AssociatedTokenInstruction.CreateAssociatedTokenIdempotent
			);

			expect(parseSolAtaInstruction(mockInstruction)).toStrictEqual({
				instructionType: AssociatedTokenInstruction.CreateAssociatedTokenIdempotent
			});

			expect(parseCreateAssociatedTokenIdempotentInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should parse a RecoverNestedAssociatedToken instruction', () => {
			vi.mocked(identifyAssociatedTokenInstruction).mockReturnValue(
				AssociatedTokenInstruction.RecoverNestedAssociatedToken
			);

			expect(parseSolAtaInstruction(mockInstruction)).toStrictEqual({
				instructionType: AssociatedTokenInstruction.RecoverNestedAssociatedToken
			});

			expect(parseRecoverNestedAssociatedTokenInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should return the original instruction if it is not a recognised ATA instruction', () => {
			// @ts-expect-error intentional for testing unknown discriminant
			vi.mocked(identifyAssociatedTokenInstruction).mockReturnValue('unknown-instruction');

			expect(parseSolAtaInstruction(mockInstruction)).toStrictEqual(mockInstruction);

			expect(parseCreateAssociatedTokenInstruction).not.toHaveBeenCalled();
			expect(parseCreateAssociatedTokenIdempotentInstruction).not.toHaveBeenCalled();
			expect(parseRecoverNestedAssociatedTokenInstruction).not.toHaveBeenCalled();
		});
	});
});
