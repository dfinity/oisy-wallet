import { BTC_MINIMUM_AMOUNT } from '$btc/constants/btc.constants';
import { invalidSendAmount } from '$btc/utils/input.utils';

describe('input.utils - BTC', () => {
	describe('invalidSendAmount', () => {
		it('should return true when amount is undefined', () => {
			expect(invalidSendAmount(undefined)).toBeTruthy();
		});

		it('should return true when amount is less than BTC_MINIMUM_AMOUNT', () => {
			const belowMinimum = Number(BTC_MINIMUM_AMOUNT) - 1;

			expect(invalidSendAmount(belowMinimum)).toBeTruthy();
		});

		it('should return false when amount equals BTC_MINIMUM_AMOUNT', () => {
			expect(invalidSendAmount(Number(BTC_MINIMUM_AMOUNT))).toBeFalsy();
		});

		it('should return false when amount is greater than BTC_MINIMUM_AMOUNT', () => {
			const aboveMinimum = Number(BTC_MINIMUM_AMOUNT) + 100;

			expect(invalidSendAmount(aboveMinimum)).toBeFalsy();
		});

		it('should handle string amounts correctly', () => {
			expect(invalidSendAmount('0')).toBeTruthy();
			expect(invalidSendAmount('-1')).toBeTruthy();
			expect(invalidSendAmount(String(Number(BTC_MINIMUM_AMOUNT) - 1))).toBeTruthy();
			expect(invalidSendAmount(String(Number(BTC_MINIMUM_AMOUNT)))).toBeFalsy();
			expect(invalidSendAmount(String(Number(BTC_MINIMUM_AMOUNT) + 100))).toBeFalsy();
		});

		it('should handle decimal amounts correctly', () => {
			const decimalBelowMinimum = Number(BTC_MINIMUM_AMOUNT) - 0.1;
			const decimalAboveMinimum = Number(BTC_MINIMUM_AMOUNT) + 0.1;

			expect(invalidSendAmount(decimalBelowMinimum)).toBeTruthy();
			expect(invalidSendAmount(decimalAboveMinimum)).toBeFalsy();
		});
	});
});
