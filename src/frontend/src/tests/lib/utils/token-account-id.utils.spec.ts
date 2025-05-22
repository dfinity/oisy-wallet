import type { TokenAccountId } from '$declarations/backend/backend.did';
import { TOKEN_ACCOUNT_ID_TO_NETWORKS } from '$lib/constants/token-account-id.constants';
import { TokenAccountIdSchema } from '$lib/schema/token-account-id.schema';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import {
	getAddressString,
	getNetworksForTokenAccountIdType
} from '$lib/utils/token-account-id.utils';

describe('token-account-id.utils', () => {
	describe('getAddressString', () => {
		it('should extract address string from BTC token account ID', () => {
			// Test for P2PKH BTC address
			const btcAddressStr = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
			const tokenAccountId = TokenAccountIdSchema.parse(btcAddressStr);

			const result = getAddressString(tokenAccountId);

			expect(result).toEqual(btcAddressStr);
		});

		it('should extract address string from ETH token account ID', () => {
			const ethAddressStr = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
			const tokenAccountId = TokenAccountIdSchema.parse(ethAddressStr);

			const result = getAddressString(tokenAccountId);

			expect(result).toEqual(ethAddressStr);
		});

		it('should extract address string from SOL token account ID', () => {
			const solAddressStr = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
			const tokenAccountId = TokenAccountIdSchema.parse(solAddressStr);

			const result = getAddressString(tokenAccountId);

			expect(result).toEqual(solAddressStr);
		});

		it('should throw an error for invalid token account ID types', () => {
			// Create an empty object that doesn't match any valid TokenAccountId type
			const invalidTokenAccountId = {} as TokenAccountId;

			expect(() => getAddressString(invalidTokenAccountId)).toThrow();
		});
	});

	describe('roundtrip conversion', () => {
		it('should handle BTC token account ID in a roundtrip conversion', () => {
			const btcAddressStr = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
			const tokenAccountId = TokenAccountIdSchema.parse(btcAddressStr);

			const result = getAddressString(tokenAccountId);

			expect(result).toEqual(btcAddressStr);
		});

		it('should handle ETH token account ID in a roundtrip conversion', () => {
			const ethAddressStr = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
			const tokenAccountId = TokenAccountIdSchema.parse(ethAddressStr);

			const result = getAddressString(tokenAccountId);

			expect(result).toEqual(ethAddressStr);
		});

		it('should handle SOL token account ID in a roundtrip conversion', () => {
			const solAddressStr = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
			const tokenAccountId = TokenAccountIdSchema.parse(solAddressStr);

			const result = getAddressString(tokenAccountId);

			expect(result).toEqual(solAddressStr);
		});
	});

	describe('getNetworksForAddressType', () => {
		it('should return networks for all types', () => {
			const TOKEN_ACCOUNT_ID_TYPES = Object.keys(
				TOKEN_ACCOUNT_ID_TO_NETWORKS
			) as TokenAccountIdTypes[];

			TOKEN_ACCOUNT_ID_TYPES.forEach((type) => {
				const networks = getNetworksForTokenAccountIdType(type);

				expect(networks).toBeDefined();
				expect(Array.isArray(networks)).toBeTruthy();
				expect(networks.length).toBeGreaterThan(0);
			});
		});
	});
});
