import { COMPUTE_BUDGET_PROGRAM_ADDRESS } from '$sol/constants/sol.constants';
import type { SolInstruction } from '$sol/types/sol-instructions';
import { parseSolComputeBudgetInstruction } from '$sol/utils/sol-instructions-compute-budget.utils';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import {
	ComputeBudgetInstruction,
	identifyComputeBudgetInstruction,
	parseRequestHeapFrameInstruction,
	parseRequestUnitsInstruction,
	parseSetComputeUnitLimitInstruction,
	parseSetComputeUnitPriceInstruction,
	parseSetLoadedAccountsDataSizeLimitInstruction
} from '@solana-program/compute-budget';
import { address } from '@solana/kit';

vi.mock(import('@solana-program/compute-budget'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		identifyComputeBudgetInstruction: vi.fn(),
		parseRequestHeapFrameInstruction: vi.fn(),
		parseRequestUnitsInstruction: vi.fn(),
		parseSetComputeUnitLimitInstruction: vi.fn(),
		parseSetComputeUnitPriceInstruction: vi.fn(),
		parseSetLoadedAccountsDataSizeLimitInstruction: vi.fn()
	};
});

describe('sol-instructions-compute-budget.utils', () => {
	describe('parseSolComputeBudgetInstruction', () => {
		const mockInstruction: SolInstruction = {
			accounts: [{ address: address(mockSolAddress), role: 3 }],
			data: new Uint8Array([1, 2, 3]),
			programAddress: address(COMPUTE_BUDGET_PROGRAM_ADDRESS)
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should raise an error if the instructions are missing the data', () => {
			const { data: _, ...withoutData } = mockInstruction;

			expect(() => parseSolComputeBudgetInstruction(withoutData)).toThrow(
				'The instruction does not have any data'
			);
		});

		it('should parse a RequestUnits instruction', () => {
			vi.mocked(identifyComputeBudgetInstruction).mockReturnValue(
				ComputeBudgetInstruction.RequestUnits
			);

			expect(parseSolComputeBudgetInstruction(mockInstruction)).toStrictEqual({
				instructionType: ComputeBudgetInstruction.RequestUnits
			});

			expect(parseRequestUnitsInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a RequestHeapFrame instruction', () => {
			vi.mocked(identifyComputeBudgetInstruction).mockReturnValue(
				ComputeBudgetInstruction.RequestHeapFrame
			);

			expect(parseSolComputeBudgetInstruction(mockInstruction)).toStrictEqual({
				instructionType: ComputeBudgetInstruction.RequestHeapFrame
			});

			expect(parseRequestHeapFrameInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a SetComputeUnitLimit instruction', () => {
			vi.mocked(identifyComputeBudgetInstruction).mockReturnValue(
				ComputeBudgetInstruction.SetComputeUnitLimit
			);

			expect(parseSolComputeBudgetInstruction(mockInstruction)).toStrictEqual({
				instructionType: ComputeBudgetInstruction.SetComputeUnitLimit
			});

			expect(parseSetComputeUnitLimitInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a SetComputeUnitPrice instruction', () => {
			vi.mocked(identifyComputeBudgetInstruction).mockReturnValue(
				ComputeBudgetInstruction.SetComputeUnitPrice
			);

			expect(parseSolComputeBudgetInstruction(mockInstruction)).toStrictEqual({
				instructionType: ComputeBudgetInstruction.SetComputeUnitPrice
			});

			expect(parseSetComputeUnitPriceInstruction).toHaveBeenCalledExactlyOnceWith(mockInstruction);
		});

		it('should parse a SetLoadedAccountsDataSizeLimit instruction', () => {
			vi.mocked(identifyComputeBudgetInstruction).mockReturnValue(
				ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit
			);

			expect(parseSolComputeBudgetInstruction(mockInstruction)).toStrictEqual({
				instructionType: ComputeBudgetInstruction.SetLoadedAccountsDataSizeLimit
			});

			expect(parseSetLoadedAccountsDataSizeLimitInstruction).toHaveBeenCalledExactlyOnceWith(
				mockInstruction
			);
		});

		it('should return the original instruction if it is not a recognized Compute Budget instruction', () => {
			// @ts-expect-error intentional for testing unknown discriminant
			vi.mocked(identifyComputeBudgetInstruction).mockReturnValue('unknown-instruction');

			expect(parseSolComputeBudgetInstruction(mockInstruction)).toStrictEqual(mockInstruction);

			expect(parseRequestUnitsInstruction).not.toHaveBeenCalled();
			expect(parseRequestHeapFrameInstruction).not.toHaveBeenCalled();
			expect(parseSetComputeUnitLimitInstruction).not.toHaveBeenCalled();
			expect(parseSetComputeUnitPriceInstruction).not.toHaveBeenCalled();
			expect(parseSetLoadedAccountsDataSizeLimitInstruction).not.toHaveBeenCalled();
		});
	});
});
