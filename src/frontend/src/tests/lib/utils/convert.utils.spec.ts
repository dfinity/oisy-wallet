import { validateConvertAmount } from '$lib/utils/convert.utils';
import { BigNumber } from 'alchemy-sdk';

describe('validateConvertAmount', () => {
	const userAmount = BigNumber.from(200000n);
	const decimals = 8;
	const balance = BigNumber.from(9000000n);
	const totalFee = 10000n;

	it('should return undefined if all data satisfies the conditions', () => {
		expect(
			validateConvertAmount({
				userAmount,
				decimals,
				balance,
				totalFee
			})
		).toBeUndefined();
	});

	it('should return insufficient funds error', () => {
		expect(
			validateConvertAmount({
				userAmount: balance.add(userAmount),
				decimals,
				balance,
				totalFee
			})
		).toBe('insufficient-funds');
	});

	it('should return insufficient funds for fee error', () => {
		expect(
			validateConvertAmount({
				userAmount: balance.sub(BigNumber.from(totalFee).div(2)),
				decimals,
				balance,
				totalFee
			})
		).toBe('insufficient-funds-for-fee');
	});

	it('should not return insufficient funds for fee error if totalFee is undefined', () => {
		expect(
			validateConvertAmount({
				userAmount: balance.sub(BigNumber.from(totalFee).div(2)),
				decimals,
				balance
			})
		).toBeUndefined();
	});
});
