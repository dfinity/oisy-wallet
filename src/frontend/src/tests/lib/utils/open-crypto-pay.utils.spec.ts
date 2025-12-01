import {
	buildSupportedNetworks,
	decodeLNURL,
	formatAddress
} from '$lib/utils/open-crypto-pay.utils';

import type { Network } from '$lib/types/network';
import type { Address } from '$lib/types/open-crypto-pay';

describe('open-crypto-pay.utils', () => {
	describe('decodeLNURL', () => {
		const mockLNURL =
			'LNURL1DP68GURN8GHJ7CTSDYHXGENC9EEHW6TNWVHHVVF0D3H82UNVWQHHQMZLVFJK2ERYVG6RZCMYX33RVEPEV5YEJ9WT';

		it('should decode valid LNURL to URL', () => {
			const result = decodeLNURL(mockLNURL);

			expect(result).toBeDefined();
			expect(result).toContain('https://');
			expect(result).toContain('api.dfx.swiss');
		});

		it('should decode LNURL to specific URL format', () => {
			const result = decodeLNURL(mockLNURL);

			expect(() => new URL(result)).not.toThrow();

			const url = new URL(result);

			expect(url.protocol).toBe('https:');
			expect(url.hostname).toContain('dfx.swiss');
		});

		it('should handle uppercase LNURL', () => {
			const result = decodeLNURL(mockLNURL.toLowerCase());

			expect(result).toBeDefined();
			expect(result).toContain('https://');
		});

		it('should throw error for invalid LNURL format', () => {
			const invalidLnurl = 'invalid-lnurl-string';

			expect(() => decodeLNURL(invalidLnurl)).toThrow();
		});

		it('should throw error for empty string', () => {
			expect(() => decodeLNURL('')).toThrow();
		});

		it('should throw error for non-lnurl prefix', () => {
			// Valid bech32 but wrong prefix
			const btcAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

			expect(() => decodeLNURL(btcAddress)).toThrow();
		});

		it('should throw error for corrupted LNURL', () => {
			// LNURL with some characters removed
			const corruptedLnurl = 'lnurl1dp68gurn8ghj7ctsdyh8gct5wvhxxmmd';

			expect(() => decodeLNURL(corruptedLnurl)).toThrow();
		});

		it('should decode and return valid UTF-8 string', () => {
			const result = decodeLNURL(mockLNURL);

			// Should not contain invalid UTF-8 characters
			expect(result).toMatch(/^[\x20-\x7E]+$/);
		});
	});

	describe('formatAddress', () => {
		it('should format complete address correctly', () => {
			const address: Address = {
				street: 'Bahnhofstrasse',
				houseNumber: '7',
				zip: '6300',
				city: 'Zug',
				country: 'CH'
			};

			expect(formatAddress(address)).toBe('Bahnhofstrasse 7, 6300 Zug');
		});

		it('should format address without country', () => {
			const address: Address = {
				street: 'Bahnhofstrasse',
				houseNumber: '7',
				zip: '6300',
				city: 'Zug'
			};

			expect(formatAddress(address)).toBe('Bahnhofstrasse 7, 6300 Zug');
		});

		it('should format address with only street', () => {
			const address: Address = {
				street: 'Main Street'
			};

			expect(formatAddress(address)).toBe('Main Street');
		});

		it('should format address with only city', () => {
			const address: Address = {
				city: 'Zurich'
			};

			expect(formatAddress(address)).toBe('Zurich');
		});

		it('should format address with zip and city', () => {
			const address: Address = {
				zip: '6300',
				city: 'Zug'
			};

			expect(formatAddress(address)).toBe('6300 Zug');
		});

		it('should format address without zip', () => {
			const address: Address = {
				street: 'Bahnhofstrasse',
				houseNumber: '7',
				city: 'Zug',
				country: 'CH'
			};

			expect(formatAddress(address)).toBe('Bahnhofstrasse 7, Zug');
		});

		it('should format address without house number', () => {
			const address: Address = {
				street: 'Bahnhofstrasse',
				zip: '6300',
				city: 'Zug'
			};

			expect(formatAddress(address)).toBe('Bahnhofstrasse, 6300 Zug');
		});

		it('should format address with only house number', () => {
			const address: Address = {
				houseNumber: '7'
			};

			expect(formatAddress(address)).toBe('7');
		});

		it('should format address with only zip', () => {
			const address: Address = {
				zip: '6300'
			};

			expect(formatAddress(address)).toBe('6300');
		});

		it('should format street and country without city', () => {
			const address: Address = {
				street: 'Main Street',
				country: 'USA'
			};

			expect(formatAddress(address)).toBe('Main Street');
		});

		it('should format street with house number and zip without city', () => {
			const address: Address = {
				street: 'Street',
				houseNumber: '10',
				zip: '12345'
			};

			expect(formatAddress(address)).toBe('Street 10, 12345');
		});

		it('should format house number with city without street', () => {
			const address: Address = {
				houseNumber: '7',
				city: 'City'
			};

			expect(formatAddress(address)).toBe('7, City');
		});

		it('should format all middle combinations', () => {
			expect(
				formatAddress({
					street: 'Street',
					city: 'City',
					country: 'Country'
				})
			).toBe('Street, City');

			expect(
				formatAddress({
					houseNumber: '5',
					zip: '1234',
					country: 'CH'
				})
			).toBe('5, 1234');

			expect(
				formatAddress({
					street: 'Street',
					houseNumber: '5',
					country: 'CH'
				})
			).toBe('Street 5');
		});

		it('should return fallback for undefined address', () => {
			expect(formatAddress(undefined)).toBe('-');
		});

		it('should return fallback for null address', () => {
			expect(formatAddress(null as unknown as Address)).toBe('-');
		});

		it('should return fallback for empty address object', () => {
			const address: Address = {};

			expect(formatAddress(address)).toBe('-');
		});

		it('should handle address with empty string values', () => {
			const address: Address = {
				street: '',
				houseNumber: '',
				zip: '',
				city: '',
				country: ''
			};

			expect(formatAddress(address)).toBe('-');
		});

		it('should filter out empty strings and keep valid values', () => {
			const address: Address = {
				street: '',
				houseNumber: '7',
				zip: '',
				city: 'Zug',
				country: ''
			};

			expect(formatAddress(address)).toBe('7, Zug');
		});

		it('should handle mixed empty and valid values', () => {
			const address: Address = {
				street: 'Street',
				houseNumber: '',
				zip: '1234',
				city: '',
				country: 'CH'
			};

			expect(formatAddress(address)).toBe('Street, 1234');
		});
	});

	describe('buildSupportedNetworks', () => {
		const mockBscNetwork = {
			name: 'BNB Smart Chain'
		} as const as Network;

		const mockEthereumNetwork = {
			name: 'Ethereum'
		} as const as Network;

		const mockPolygonNetwork = {
			name: 'Polygon'
		} as const as Network;

		const mockBitcoinNetwork = {
			name: 'Bitcoin'
		} as const as Network;

		it('should return empty Set for empty networks array', () => {
			const result = buildSupportedNetworks([]);

			expect(result).toBeInstanceOf(Set);
			expect(result.size).toBe(0);
		});

		it('should build Set with single network', () => {
			const result = buildSupportedNetworks([mockEthereumNetwork]);

			expect(result).toBeInstanceOf(Set);
			expect(result.size).toBe(1);
			expect(result.has('Ethereum')).toBeTruthy();
		});

		it('should build Set with multiple networks', () => {
			const networks = [mockEthereumNetwork, mockPolygonNetwork, mockBitcoinNetwork];
			const result = buildSupportedNetworks(networks);

			expect(result.size).toBe(3);
			expect(result.has('Ethereum')).toBeTruthy();
			expect(result.has('Polygon')).toBeTruthy();
			expect(result.has('Bitcoin')).toBeTruthy();
		});

		it('should apply network name exception for BSC', () => {
			const networks = [mockBscNetwork, mockEthereumNetwork];
			const result = buildSupportedNetworks(networks);

			expect(result.size).toBe(2);
			expect(result.has('BinanceSmartChain')).toBeTruthy();
			expect(result.has('Ethereum')).toBeTruthy();
			expect(result.has('BscMainnet')).toBeFalsy();
		});

		it('should handle duplicate networks', () => {
			const networks = [mockEthereumNetwork, mockEthereumNetwork, mockPolygonNetwork];
			const result = buildSupportedNetworks(networks);

			expect(result.size).toBe(2);
			expect(result.has('Ethereum')).toBeTruthy();
			expect(result.has('Polygon')).toBeTruthy();
		});

		it('should handle mix of regular and exception networks', () => {
			const networks = [
				mockBscNetwork,
				mockEthereumNetwork,
				mockPolygonNetwork,
				mockBitcoinNetwork
			];
			const result = buildSupportedNetworks(networks);

			expect(result.size).toBe(4);
			expect(result.has('BinanceSmartChain')).toBeTruthy();
			expect(result.has('Ethereum')).toBeTruthy();
			expect(result.has('Polygon')).toBeTruthy();
			expect(result.has('Bitcoin')).toBeTruthy();
		});

		it('should handle only BSC network', () => {
			const result = buildSupportedNetworks([mockBscNetwork]);

			expect(result.size).toBe(1);
			expect(result.has('BinanceSmartChain')).toBeTruthy();
			expect(result.has('BscMainnet')).toBeFalsy();
		});

		it('should return new Set instance each time', () => {
			const networks = [mockEthereumNetwork];
			const result1 = buildSupportedNetworks(networks);
			const result2 = buildSupportedNetworks(networks);

			expect(result1).not.toBe(result2);
			expect(result1).toEqual(result2);
		});
	});
});
