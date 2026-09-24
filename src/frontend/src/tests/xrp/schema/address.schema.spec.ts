import { XrpAddressSchema } from '$xrp/schema/address.schema';

describe('address.schema', () => {
	describe('XrpAddressSchema', () => {
		it('should validate valid XRPL classic addresses', () => {
			const validAddresses = [
				'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD',
				'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'
			];

			validAddresses.forEach((address) => {
				const result = XrpAddressSchema.safeParse(address);

				expect(result.success).toBeTruthy();
				expect(result.data).toEqual(address);
			});
		});

		it('should fail validation for non-string values', () => {
			expect(XrpAddressSchema.safeParse(123).success).toBeFalsy();
			expect(XrpAddressSchema.safeParse(null).success).toBeFalsy();
			expect(XrpAddressSchema.safeParse(undefined).success).toBeFalsy();
			expect(XrpAddressSchema.safeParse({}).success).toBeFalsy();
		});

		it('should fail validation for invalid XRPL classic addresses', () => {
			const invalidAddresses = [
				'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpX', // Invalid checksum
				'not-an-address', // Not an address
				'0x71C7656EC7ab88b098defB751B7401B5f6d8976F', // Wrong chain (Ethereum)
				'r' // Too short
			];

			invalidAddresses.forEach((address) => {
				const result = XrpAddressSchema.safeParse(address);

				expect(result.success).toBeFalsy();
			});
		});
	});
});
