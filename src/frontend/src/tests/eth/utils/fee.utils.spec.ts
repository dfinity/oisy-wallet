import { estimatedGasFee, maxGasFee, minGasFee } from '$eth/utils/fee.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { TransactionFeeData } from '$lib/types/transaction';

describe('fee.utils', () => {
	const gas = 21_000n;

	describe('maxGasFee', () => {
		it('prices the gas limit at the authorised ceiling', () => {
			expect(maxGasFee({ maxFeePerGas: 50n, maxPriorityFeePerGas: 2n, gas })).toBe(50n * gas);
		});

		it('returns undefined when the ceiling is unknown', () => {
			expect(maxGasFee({ maxFeePerGas: null, maxPriorityFeePerGas: 2n, gas })).toBeUndefined();
		});
	});

	describe('minGasFee', () => {
		it('prices the gas limit at the tip alone', () => {
			expect(minGasFee({ maxFeePerGas: 50n, maxPriorityFeePerGas: 2n, gas })).toBe(2n * gas);
		});

		it('treats a missing tip as zero', () => {
			expect(minGasFee({ maxFeePerGas: 50n, maxPriorityFeePerGas: null, gas })).toBe(ZERO);
		});
	});

	describe('estimatedGasFee', () => {
		const feeData: TransactionFeeData = {
			baseFeePerGas: 20n,
			maxFeePerGas: 50n,
			maxPriorityFeePerGas: 2n,
			gas
		};

		it('prices the gas limit at base fee plus tip', () => {
			expect(estimatedGasFee(feeData)).toBe(22n * gas);
		});

		it('is strictly below the ceiling when the ceiling carries headroom', () => {
			const estimated = estimatedGasFee(feeData);
			const max = maxGasFee(feeData);

			expect(estimated).toBeDefined();
			expect(max).toBeDefined();
			expect(estimated ?? ZERO).toBeLessThan(max ?? ZERO);
		});

		it('never exceeds the ceiling when the base fee has risen past it', () => {
			// The base fee is sampled, so it can outrun the ceiling that was authorised against it.
			expect(estimatedGasFee({ ...feeData, baseFeePerGas: 100n })).toBe(50n * gas);
		});

		it('treats a missing tip as zero', () => {
			expect(estimatedGasFee({ ...feeData, maxPriorityFeePerGas: null })).toBe(20n * gas);
		});

		it.each([{ baseFeePerGas: undefined }, { baseFeePerGas: null }])(
			'falls back to the ceiling when the base fee is $baseFeePerGas',
			({ baseFeePerGas }) => {
				expect(estimatedGasFee({ ...feeData, baseFeePerGas })).toBe(maxGasFee(feeData));
			}
		);

		it('returns undefined when the ceiling is unknown', () => {
			expect(estimatedGasFee({ ...feeData, maxFeePerGas: null })).toBeUndefined();
		});
	});
});
