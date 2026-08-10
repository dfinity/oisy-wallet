import { ZERO } from '$lib/constants/app.constants';
import {
	COMPUTE_BUDGET_PROGRAM_ADDRESS,
	MICROLAMPORTS_PER_LAMPORT,
	SOLANA_MAX_COMPUTE_UNIT_LIMIT
} from '$sol/constants/sol.constants';
import type { SolInstruction } from '$sol/types/sol-instructions';
import {
	calculateSolPrioritizationFee,
	parseSolComputeBudgetInstruction
} from '$sol/utils/sol-instructions-compute-budget.utils';
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

		it('should raise an error if it is not a recognized Compute Budget instruction', () => {
			// @ts-expect-error intentional for testing unknown discriminant
			vi.mocked(identifyComputeBudgetInstruction).mockReturnValue('unknown-instruction');

			expect(() => parseSolComputeBudgetInstruction(mockInstruction)).toThrow(
				'Unknown Solana Compute Budget instruction: unknown-instruction'
			);
		});
	});

	describe('calculateSolPrioritizationFee', () => {
		it('should return undefined when no compute unit price is requested', () => {
			expect(calculateSolPrioritizationFee({ instructionsCount: 3 })).toBeUndefined();

			expect(
				calculateSolPrioritizationFee({ computeUnitLimit: 200_000n, instructionsCount: 3 })
			).toBeUndefined();
		});

		it('should return undefined when the compute unit price is zero', () => {
			expect(
				calculateSolPrioritizationFee({
					computeUnitPrice: ZERO,
					computeUnitLimit: 1_000_000n,
					instructionsCount: 3
				})
			).toBeUndefined();
		});

		it('should default the compute unit limit to the per-instruction budget when only the price is set', () => {
			// 1_000_000 micro-lamports x (200_000 x 3) compute units = 600_000 lamports
			expect(
				calculateSolPrioritizationFee({ computeUnitPrice: 1_000_000n, instructionsCount: 3 })
			).toBe(600_000n);
		});

		it('should cap the defaulted compute unit limit at the transaction-wide maximum', () => {
			// 200_000 x 20 instructions exceeds the cap, so 1_000_000 micro-lamports are charged on
			// 1_400_000 compute units instead
			expect(
				calculateSolPrioritizationFee({ computeUnitPrice: 1_000_000n, instructionsCount: 20 })
			).toBe(1_400_000n);
		});

		it('should use the requested compute unit limit when both price and limit are set', () => {
			// 1_563_686 micro-lamports x 152_343 compute units, rounded up to the next lamport
			expect(
				calculateSolPrioritizationFee({
					computeUnitPrice: 1_563_686n,
					computeUnitLimit: 152_343n,
					instructionsCount: 5
				})
			).toBe(238_217n);
		});

		it.each([
			{ computeUnitPrice: 714_285_715n, expected: 1_000_000_001n },
			{ computeUnitPrice: 71_428_571_429n, expected: 100_000_000_001n }
		])(
			'should round a fee of $computeUnitPrice micro-lamports per unit up, not down',
			({ computeUnitPrice, expected }) => {
				expect(
					calculateSolPrioritizationFee({
						computeUnitPrice,
						computeUnitLimit: SOLANA_MAX_COMPUTE_UNIT_LIMIT,
						instructionsCount: 3
					})
				).toBe(expected);
			}
		);

		it('should round the fee up to the next whole lamport', () => {
			expect(
				calculateSolPrioritizationFee({
					computeUnitPrice: 1n,
					computeUnitLimit: 1n,
					instructionsCount: 1
				})
			).toBe(1n);

			expect(
				calculateSolPrioritizationFee({
					computeUnitPrice: 1n,
					computeUnitLimit: MICROLAMPORTS_PER_LAMPORT,
					instructionsCount: 1
				})
			).toBe(1n);
		});

		it('should cap an extreme requested compute unit limit at the transaction-wide maximum', () => {
			expect(
				calculateSolPrioritizationFee({
					computeUnitPrice: 1_000_000n,
					computeUnitLimit: 2n ** 32n - 1n,
					instructionsCount: 1
				})
			).toBe(1_400_000n);
		});

		it('should compute a draining fee from an extreme compute unit price', () => {
			expect(
				calculateSolPrioritizationFee({
					computeUnitPrice: 2n ** 64n - 1n,
					computeUnitLimit: SOLANA_MAX_COMPUTE_UNIT_LIMIT,
					instructionsCount: 2
				})
			).toBe(25_825_441_703_193_372_261n);
		});
	});
});
