import { CoingeckoCoinsIdSchema } from '$lib/validation/coingecko.validation';

describe('CoingeckoCoinsIdSchema', () => {
	it('should pass validation for "ethereum"', () => {
		const validData = 'ethereum';

		expect(CoingeckoCoinsIdSchema.parse(validData)).toEqual(validData);
	});

	it('should pass validation for "bitcoin"', () => {
		const validData = 'bitcoin';

		expect(CoingeckoCoinsIdSchema.parse(validData)).toEqual(validData);
	});

	it('should pass validation for "internet-computer"', () => {
		const validData = 'internet-computer';

		expect(CoingeckoCoinsIdSchema.parse(validData)).toEqual(validData);
	});

	it('should fail validation for an unsupported coin ID', () => {
		const invalidData = 'dogecoin';

		expect(() => CoingeckoCoinsIdSchema.parse(invalidData)).toThrow();
	});

	it('should fail validation for a number instead of a string', () => {
		const invalidData = 123;

		expect(() => CoingeckoCoinsIdSchema.parse(invalidData)).toThrow();
	});

	it('should fail validation for null', () => {
		const invalidData = null;

		expect(() => CoingeckoCoinsIdSchema.parse(invalidData)).toThrow();
	});

	it('should fail validation for undefined', () => {
		const invalidData = undefined;

		expect(() => CoingeckoCoinsIdSchema.parse(invalidData)).toThrow();
	});
});
