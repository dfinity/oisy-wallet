import { EthAddressObjectSchema, EthAddressSchema } from '$eth/schema/address.schema';

describe('address.schema', () => {
	describe('EthAddressSchema', () => {
		it('should validate a valid Ethereum address', () => {
			const validAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
			const result = EthAddressSchema.safeParse(validAddress);

			expect(result.success).toBeTruthy();
		});

		it('should reject an invalid Ethereum address', () => {
			const invalidAddress = '0xG1C7656EC7ab88b098defB751B7401B5f6d8976F'; // Invalid character (G)
			const result = EthAddressSchema.safeParse(invalidAddress);

			expect(result.success).toBeFalsy();
		});

		it('should validate valid Ethereum addresses', () => {
			// Valid Ethereum addresses according to ethers isAddress function
			const validAddresses = [
				'0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
				'0x1234567890123456789012345678901234567890',
				'0x0000000000000000000000000000000000000000' // Zero address is valid for ethers
			];

			validAddresses.forEach((address) => {
				const result = EthAddressObjectSchema.safeParse(address);

				expect(result.success).toBeTruthy();
				expect(result.data).toEqual({ Public: address });
			});
		});

		it('should fail validation for non-string values', () => {
			expect(EthAddressObjectSchema.safeParse(123).success).toBeFalsy();
			expect(EthAddressObjectSchema.safeParse(null).success).toBeFalsy();
			expect(EthAddressObjectSchema.safeParse(undefined).success).toBeFalsy();
			expect(EthAddressObjectSchema.safeParse({}).success).toBeFalsy();
		});

		it('should fail validation for invalid Ethereum addresses', () => {
			// Invalid Ethereum addresses according to ethers isAddress function
			const invalidAddresses = [
				'0x71C7656EC7ab88b098defB751B7401B5f6d897', // Too short
				'0x71C7656EC7ab88b098defB751B7401B5f6d8976F00', // Too long
				'0xG1C7656EC7ab88b098defB751B7401B5f6d8976F', // Invalid character (G)
				'0xinvalid' // Invalid format
			];

			invalidAddresses.forEach((address) => {
				const result = EthAddressObjectSchema.safeParse(address);

				expect(result.success).toBeFalsy();
			});
		});
	});
});
