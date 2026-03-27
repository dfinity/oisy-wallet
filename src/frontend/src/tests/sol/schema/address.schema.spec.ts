import { SolAddressSchema } from '$sol/schema/address.schema';

describe('address.schema', () => {
	describe('SolAddressSchema', () => {
		it('should validate valid Solana addresses', () => {
			// Valid Solana addresses (base58 encoded, 32-44 characters)
			const validAddresses = [
				'DRpbCBMxVnDK7maPM5tGv6MvB3v1TuAeJvzNg9pRcRGD',
				'5vfCbYFSP5GcFhKQz11DXvxiwjwEUyXRYmP7W7HS2wJk',
				'3h1zGmCwsRJnVk5BuRNnHaE2HNhB5Z8oEo8kvwXBvrzD'
			];

			validAddresses.forEach((address) => {
				const result = SolAddressSchema.safeParse(address);

				expect(result.success).toBeTruthy();
				expect(result.data).toEqual(address);
			});
		});

		it('should fail validation for non-string values', () => {
			expect(SolAddressSchema.safeParse(123).success).toBeFalsy();
			expect(SolAddressSchema.safeParse(null).success).toBeFalsy();
			expect(SolAddressSchema.safeParse(undefined).success).toBeFalsy();
			expect(SolAddressSchema.safeParse({}).success).toBeFalsy();
		});

		it('should fail validation for invalid Solana addresses', () => {
			// Invalid Solana addresses
			const invalidAddresses = [
				'DRpbCBMxVnDK7maPM5tGv6MvB3v1TuAeJvzNg9pRc', // Too short
				'DRpbCBMxVnDK7maPM5tGv6MvB3v1TuAeJvzNg9pRcRGDD', // Too long
				'0xDRpbCBMxVnDK7maPM5tGv6MvB3v1TuAeJvzNg9pRcRGD', // Wrong format (with 0x)
				'DRpbCBMxVnDK7maPM5tGv6MvB3v1TuAeJvzNg9pRcRG!', // Invalid character (!)
				'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO' // Invalid base58 characters
			];

			invalidAddresses.forEach((address) => {
				const result = SolAddressSchema.safeParse(address);

				expect(result.success).toBeFalsy();
			});
		});
	});
});
