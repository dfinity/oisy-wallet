import { ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolInstruction } from '$sol/types/sol-instructions';
import { parseSolLookupTableInstruction } from '$sol/utils/sol-instructions-lookup-table.utils';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import {
	AddressLookupTableInstruction,
	identifyAddressLookupTableInstruction,
	parseCloseLookupTableInstruction,
	parseCreateLookupTableInstruction,
	parseDeactivateLookupTableInstruction,
	parseExtendLookupTableInstruction,
	parseFreezeLookupTableInstruction
} from '@solana-program/address-lookup-table';
import { address } from '@solana/kit';

vi.mock(import('@solana-program/address-lookup-table'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		identifyAddressLookupTableInstruction: vi.fn(),
		parseCreateLookupTableInstruction: vi.fn(),
		parseFreezeLookupTableInstruction: vi.fn(),
		parseExtendLookupTableInstruction: vi.fn(),
		parseDeactivateLookupTableInstruction: vi.fn(),
		parseCloseLookupTableInstruction: vi.fn()
	};
});

describe('sol-instructions-lookup-table.utils', () => {
	describe('parseSolLookupTableInstruction', () => {
		const mockInstruction: SolInstruction = {
			accounts: [{ address: address(mockSolAddress), role: 3 }],
			data: new Uint8Array([1, 2, 3]),
			programAddress: address(ADDRESS_LOOKUP_TABLE_PROGRAM_ADDRESS)
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should raise an error if the instruction is missing the data', () => {
			const { data: _, ...withoutData } = mockInstruction;

			expect(() => parseSolLookupTableInstruction(withoutData)).toThrow(
				'The instruction does not have any data'
			);
		});

		it('should raise an error if the instruction is missing the accounts', () => {
			const { accounts: _, ...withoutAccounts } = mockInstruction;

			expect(() => parseSolLookupTableInstruction(withoutAccounts)).toThrow(
				'The instruction does not have any accounts'
			);
		});

		it.each([
			{
				instructionType: AddressLookupTableInstruction.CreateLookupTable,
				parser: parseCreateLookupTableInstruction
			},
			{
				instructionType: AddressLookupTableInstruction.FreezeLookupTable,
				parser: parseFreezeLookupTableInstruction
			},
			{
				instructionType: AddressLookupTableInstruction.ExtendLookupTable,
				parser: parseExtendLookupTableInstruction
			},
			{
				instructionType: AddressLookupTableInstruction.DeactivateLookupTable,
				parser: parseDeactivateLookupTableInstruction
			},
			{
				instructionType: AddressLookupTableInstruction.CloseLookupTable,
				parser: parseCloseLookupTableInstruction
			}
		])('should parse a $instructionType instruction', ({ instructionType, parser }) => {
			vi.mocked(identifyAddressLookupTableInstruction).mockReturnValue(instructionType);

			expect(parseSolLookupTableInstruction(mockInstruction)).toStrictEqual({ instructionType });

			expect(parser).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should raise an error if it is not a recognised Address Lookup Table instruction', () => {
			// @ts-expect-error intentional for testing unknown discriminant
			vi.mocked(identifyAddressLookupTableInstruction).mockReturnValue('unknown-instruction');

			expect(() => parseSolLookupTableInstruction(mockInstruction)).toThrow(
				'Unknown Solana Address Lookup Table instruction: unknown-instruction'
			);
		});
	});
});
