import {
	BtcAddressObjectSchema,
	BtcAddressSchema,
	EthAddressObjectSchema,
	EthAddressSchema,
	SolAddressSchema
} from '$lib/schema/address.schema';

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

	describe('BtcAddressObjectSchema', () => {
		it('should validate P2PKH addresses (legacy addresses starting with 1)', () => {
			const p2pkhAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

			const result = BtcAddressObjectSchema.safeParse(p2pkhAddress);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ P2PKH: p2pkhAddress });
		});

		it('should validate P2SH addresses (legacy addresses starting with 3)', () => {
			const p2shAddress = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';

			const result = BtcAddressObjectSchema.safeParse(p2shAddress);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ P2SH: p2shAddress });
		});

		it('should validate P2WPKH addresses (segwit addresses starting with bc1q)', () => {
			const p2wpkhAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

			const result = BtcAddressObjectSchema.safeParse(p2wpkhAddress);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ P2WPKH: p2wpkhAddress });
		});

		it('should validate P2WSH addresses (segwit script addresses)', () => {
			const p2wshAddress = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';

			const result = BtcAddressObjectSchema.safeParse(p2wshAddress);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ P2WSH: p2wshAddress });
		});

		it('should validate P2TR addresses (taproot addresses starting with bc1p)', () => {
			const p2trAddress = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';

			const result = BtcAddressObjectSchema.safeParse(p2trAddress);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ P2TR: p2trAddress });
		});

		it('should fail validation for non-string values', () => {
			expect(BtcAddressObjectSchema.safeParse(123).success).toBeFalsy();
			expect(BtcAddressObjectSchema.safeParse(null).success).toBeFalsy();
			expect(BtcAddressObjectSchema.safeParse(undefined).success).toBeFalsy();
			expect(BtcAddressObjectSchema.safeParse({}).success).toBeFalsy();
		});

		it('should fail validation for invalid BTC addresses', () => {
			// Invalid BTC addresses (wrong checksums or formats)
			const invalidAddresses = [
				'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlx', // Invalid checksum
				'1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3', // Invalid P2PKH
				'3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLz', // Invalid P2SH
				'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mda', // Invalid P2WPKH
				'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj1' // Invalid P2TR
			];

			invalidAddresses.forEach((address) => {
				const result = BtcAddressObjectSchema.safeParse(address);

				expect(result.success).toBeFalsy();
			});
		});

		it('should validate a valid address and reject an invalid address', () => {
			// Valid P2PKH address
			const validAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
			const validResult = BtcAddressSchema.safeParse(validAddress);

			expect(validResult.success).toBeTruthy();

			// Invalid address (wrong checksum)
			const invalidAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3';
			const invalidResult = BtcAddressSchema.safeParse(invalidAddress);

			expect(invalidResult.success).toBeFalsy();
		});
	});

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
