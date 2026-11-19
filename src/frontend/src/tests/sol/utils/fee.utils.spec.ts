import { ZERO } from '$lib/constants/app.constants';
import {
	MICROLAMPORTS_PER_LAMPORT,
	SOLANA_MAX_COMPUTE_UNIT_LIMIT
} from '$sol/constants/sol.constants';
import {
	calculateSolPrioritizationFee,
	convertSolComputeUnitPriceToFee,
	resolveSolComputeUnitLimit
} from '$sol/utils/fee.utils';

describe('fee.utils', () => {
	describe('resolveSolComputeUnitLimit', () => {
		it('should default to the per-instruction budget when no limit is requested', () => {
			expect(resolveSolComputeUnitLimit({ instructionsCount: 3 })).toBe(600_000n);
		});

		it('should clamp both the requested and the defaulted limit to the transaction-wide cap', () => {
			expect(resolveSolComputeUnitLimit({ instructionsCount: 20 })).toBe(
				SOLANA_MAX_COMPUTE_UNIT_LIMIT
			);

			expect(
				resolveSolComputeUnitLimit({ computeUnitLimit: 2n ** 32n - 1n, instructionsCount: 1 })
			).toBe(SOLANA_MAX_COMPUTE_UNIT_LIMIT);
		});

		it('should keep a requested limit below the cap', () => {
			expect(resolveSolComputeUnitLimit({ computeUnitLimit: 50_000n, instructionsCount: 9 })).toBe(
				50_000n
			);
		});
	});

	describe('convertSolComputeUnitPriceToFee', () => {
		it('should scale micro-lamports per compute unit down to whole lamports', () => {
			// 1_000_000 micro-lamports per unit is exactly 1 lamport per unit
			expect(
				convertSolComputeUnitPriceToFee({
					computeUnitPrice: MICROLAMPORTS_PER_LAMPORT,
					computeUnitLimit: 200_000n
				})
			).toBe(200_000n);
		});

		it('should not confuse a price with a fee', () => {
			// a price of 50_000 micro-lamports per unit over 200_000 units is 10_000 lamports, three
			// orders of magnitude away from the price itself
			expect(
				convertSolComputeUnitPriceToFee({
					computeUnitPrice: 50_000n,
					computeUnitLimit: 200_000n
				})
			).toBe(10_000n);
		});

		it('should round up to the next whole lamport', () => {
			expect(convertSolComputeUnitPriceToFee({ computeUnitPrice: 1n, computeUnitLimit: 1n })).toBe(
				1n
			);

			expect(
				convertSolComputeUnitPriceToFee({
					computeUnitPrice: 1n,
					computeUnitLimit: MICROLAMPORTS_PER_LAMPORT
				})
			).toBe(1n);
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
