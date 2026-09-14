import { estimatedGasFee, formatGasFeeInGwei, maxGasFee, minGasFee } from '$eth/utils/fee.utils';
import { ZERO } from '$lib/constants/app.constants';
import { Languages } from '$lib/enums/languages';
import type { TransactionFeeData } from '$lib/types/transaction';
import { parseToken } from '$lib/utils/parse.utils';

describe('fee.utils', () => {
	const gas = 21_000n;

	describe('maxGasFee', () => {
		it('prices the gas limit at the authorised ceiling', () => {
			expect(maxGasFee({ maxFeePerGas: 50n, maxPriorityFeePerGas: 2n, gas })).toBe(50n * gas);
		});

		it('returns undefined when the ceiling is unknown', () => {
			expect(maxGasFee({ maxFeePerGas: null, maxPriorityFeePerGas: 2n, gas })).toBeUndefined();
		});

		it('adds the L1 data fee, which no amount of gas headroom pays for', () => {
			expect(maxGasFee({ maxFeePerGas: 50n, maxPriorityFeePerGas: 2n, gas, l1Fee: 875n })).toBe(
				50n * gas + 875n
			);
		});

		// The defect this guards: "Max" spends `balance - maxGasFee`, so a balance that covers exactly
		// `maxGasFee` has to cover the L1 data fee too, or an OP-stack chain can never include the
		// transaction.
		it('leaves an OP-stack balance able to cover the whole transaction', () => {
			const maxFeePerGas = 26_000_000n;
			const l1Fee = 875_004_002n;
			const balance = 2_453_785_811_356_486n;

			const maxAmount =
				balance -
				(maxGasFee({ maxFeePerGas, maxPriorityFeePerGas: 4_000_000n, gas, l1Fee }) ?? ZERO);

			expect(maxAmount + maxFeePerGas * gas + l1Fee).toBeLessThanOrEqual(balance);
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

		it('adds the L1 data fee in full, since none of it is refunded', () => {
			expect(estimatedGasFee({ ...feeData, l1Fee: 875n })).toBe(22n * gas + 875n);
		});

		it('adds the L1 data fee to the fallback ceiling too', () => {
			expect(estimatedGasFee({ ...feeData, baseFeePerGas: null, l1Fee: 875n })).toBe(
				50n * gas + 875n
			);
		});
	});

	describe('formatGasFeeInGwei', () => {
		const format = (value: string): string =>
			formatGasFeeInGwei({
				value: parseToken({ value, unitName: 'gwei' }),
				language: Languages.ENGLISH
			});

		it.each([
			// The digits go to the leading figures: a fee this size gains nothing from a fraction.
			{ value: '44185.0944', expected: '44,185' },
			{ value: '21000', expected: '21,000' },
			// Three leading figures leave room for one more.
			{ value: '429.5888', expected: '429.6' },
			{ value: '126', expected: '126' },
			// A fee that is nothing but its decimals keeps them.
			{ value: '1.234', expected: '1.234' }
		])('should quote $value gwei as $expected', ({ value, expected }) => {
			expect(format(value)).toBe(expected);
		});

		it('should keep every integer digit of a fee too large for a JS number', () => {
			// Above 2^53 gwei a `Number` starts dropping integer digits, which would silently change
			// the amount shown. Absurd as a fee, but the formatter should not be the thing that lies.
			expect(format('12345678901234567')).toBe('12,345,678,901,234,567');
		});

		it('should not round a fee below one gwei down to zero', () => {
			// A fixed number of decimals would print `0` here, quoting a free transaction.
			expect(format('0.0001234')).toBe('0.000123');
		});
	});
});
