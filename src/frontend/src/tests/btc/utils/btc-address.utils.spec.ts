import { getBtcAddressString, parseBtcAddress } from '$btc/utils/btc-address.utils';
import type { BtcAddress } from '$declarations/backend/backend.did';
import { assertNonNullish } from '@dfinity/utils';

describe('btc-address.utils', () => {
	describe('parseBtcAddress', () => {
		it('should parse P2PKH addresses (legacy addresses starting with 1)', () => {
			const p2pkhAddress = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';

			const result = parseBtcAddress(p2pkhAddress);

			expect(result).toEqual({ P2PKH: p2pkhAddress });
		});

		it('should parse P2SH addresses (legacy addresses starting with 3)', () => {
			const p2shAddress = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';

			const result = parseBtcAddress(p2shAddress);

			expect(result).toEqual({ P2SH: p2shAddress });
		});

		it('should parse P2WPKH addresses (segwit addresses starting with bc1q)', () => {
			const p2wpkhAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

			const result = parseBtcAddress(p2wpkhAddress);

			expect(result).toEqual({ P2WPKH: p2wpkhAddress });
		});

		it('should parse P2WSH addresses (segwit script addresses)', () => {
			const p2wshAddress = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';

			const result = parseBtcAddress(p2wshAddress);

			expect(result).toEqual({ P2WSH: p2wshAddress });
		});

		it('should parse P2TR addresses (taproot addresses starting with bc1p)', () => {
			const p2trAddress = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';

			const result = parseBtcAddress(p2trAddress);

			expect(result).toEqual({ P2TR: p2trAddress });
		});

		it('should return undefined for invalid BTC addresses', () => {
			// Invalid BTC addresses (wrong checksums or formats)
			const invalidAddresses = [
				'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlx', // Invalid checksum
				'1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN3', // Invalid P2PKH
				'3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLz', // Invalid P2SH
				'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mda', // Invalid P2WPKH
				'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj1', // Invalid P2TR
				'', // Empty string
				'not-a-bitcoin-address', // Completely invalid format
				'0x71C7656EC7ab88b098defB751B7401B5f6d8976F' // Ethereum address
			];

			invalidAddresses.forEach((address) => {
				const result = parseBtcAddress(address);

				expect(result).toBeUndefined();
			});
		});

		it('should return undefined for non-string inputs', () => {
			// @ts-expect-error Testing invalid input types
			expect(parseBtcAddress(123)).toBeUndefined();
			// @ts-expect-error Testing invalid input types
			expect(parseBtcAddress(null)).toBeUndefined();
			// @ts-expect-error Testing invalid input types
			expect(parseBtcAddress(undefined)).toBeUndefined();
			// @ts-expect-error Testing invalid input types
			expect(parseBtcAddress({})).toBeUndefined();
		});
	});

	describe('getBtcAddressString', () => {
		it('should extract address string from P2PKH address object', () => {
			const addressStr = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
			const addressObj: BtcAddress = { P2PKH: addressStr };

			const result = getBtcAddressString(addressObj);

			expect(result).toEqual(addressStr);
		});

		it('should extract address string from P2SH address object', () => {
			const addressStr = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';
			const addressObj: BtcAddress = { P2SH: addressStr };

			const result = getBtcAddressString(addressObj);

			expect(result).toEqual(addressStr);
		});

		it('should extract address string from P2WPKH address object', () => {
			const addressStr = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
			const addressObj: BtcAddress = { P2WPKH: addressStr };

			const result = getBtcAddressString(addressObj);

			expect(result).toEqual(addressStr);
		});

		it('should extract address string from P2WSH address object', () => {
			const addressStr = 'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3';
			const addressObj: BtcAddress = { P2WSH: addressStr };

			const result = getBtcAddressString(addressObj);

			expect(result).toEqual(addressStr);
		});

		it('should extract address string from P2TR address object', () => {
			const addressStr = 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0';
			const addressObj: BtcAddress = { P2TR: addressStr };

			const result = getBtcAddressString(addressObj);

			expect(result).toEqual(addressStr);
		});

		it('should return undefined for invalid BtcAddress objects', () => {
			// @ts-expect-error Testing invalid input
			expect(() => getBtcAddressString({})).toThrow();
			// @ts-expect-error Testing invalid input
			expect(() => getBtcAddressString({ InvalidType: 'address' })).toThrow();
		});
	});

	describe('roundtrip conversion', () => {
		it('should handle all valid BTC address types in a roundtrip conversion', () => {
			const validAddresses = [
				'1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', // P2PKH
				'3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', // P2SH
				'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', // P2WPKH
				'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3', // P2WSH
				'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0' // P2TR
			];

			validAddresses.forEach((address) => {
				const parsedAddress = parseBtcAddress(address);
				assertNonNullish(parsedAddress);
				const recoveredAddress = getBtcAddressString(parsedAddress);

				expect(recoveredAddress).toEqual(address);
			});
		});
	});
});
