import type { TokenAccountId } from '$declarations/backend/backend.did';
import { TOKEN_ACCOUNT_ID_TO_NETWORKS } from '$lib/constants/token-account-id.constants';
import { TokenAccountIdSchema } from '$lib/schema/token-account-id.schema';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import {
	getNetworksForTokenAccountIdType,
	getTokenAccountIdAddressString
} from '$lib/utils/token-account-id.utils';

describe('token-account-id.utils', () => {
	describe('getTokenAccountIdAddressString', () => {
		it('should extract address string from BTC token account ID', () => {
			// Test for P2PKH BTC address
			const btcAddressStr = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
			const tokenAccountId = TokenAccountIdSchema.parse(btcAddressStr);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(btcAddressStr);
		});

		it('should extract address string from ETH token account ID', () => {
			const ethAddressStr = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
			const tokenAccountId = TokenAccountIdSchema.parse(ethAddressStr);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(ethAddressStr);
		});

		it('should extract address string from SOL token account ID', () => {
			const solAddressStr = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
			const tokenAccountId = TokenAccountIdSchema.parse(solAddressStr);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(solAddressStr);
		});

		it('should extract address string from Icrcv2 token account ID with ICP account identifier', () => {
			const icpAccountId = '6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a';
			const tokenAccountId = TokenAccountIdSchema.parse(icpAccountId);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(icpAccountId);
		});

		it('should extract address string from Icrcv2 token account ID with principal only', () => {
			const principal = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
			const tokenAccountId = TokenAccountIdSchema.parse(principal);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(principal);
		});

		it('should extract address string from Icrcv2 token account ID with principal and subaccount', () => {
			const icrcAccount =
				'k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae-6cc627i.1';
			const tokenAccountId = TokenAccountIdSchema.parse(icrcAccount);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(icrcAccount);
		});

		it('should throw an error for invalid token account ID types', () => {
			// Create an empty object that doesn't match any valid TokenAccountId type
			const invalidTokenAccountId = {} as TokenAccountId;

			expect(() => getTokenAccountIdAddressString(invalidTokenAccountId)).toThrow();
		});
	});

	describe('roundtrip conversion', () => {
		it('should handle BTC token account ID in a roundtrip conversion', () => {
			const btcAddressStr = '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2';
			const tokenAccountId = TokenAccountIdSchema.parse(btcAddressStr);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(btcAddressStr);
		});

		it('should handle ETH token account ID in a roundtrip conversion', () => {
			const ethAddressStr = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
			const tokenAccountId = TokenAccountIdSchema.parse(ethAddressStr);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(ethAddressStr);
		});

		it('should handle SOL token account ID in a roundtrip conversion', () => {
			const solAddressStr = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
			const tokenAccountId = TokenAccountIdSchema.parse(solAddressStr);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(solAddressStr);
		});

		it('should handle Icrcv2 token account ID with ICP account identifier in a roundtrip conversion', () => {
			const icpAccountId = '6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a';
			const tokenAccountId = TokenAccountIdSchema.parse(icpAccountId);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(icpAccountId);
		});

		it('should handle Icrcv2 token account ID with principal only in a roundtrip conversion', () => {
			const principal = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
			const tokenAccountId = TokenAccountIdSchema.parse(principal);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(principal);
		});

		it('should handle Icrcv2 token account ID with principal and subaccount in a roundtrip conversion', () => {
			const icrcAccount =
				'k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae-6cc627i.1';
			const tokenAccountId = TokenAccountIdSchema.parse(icrcAccount);

			const result = getTokenAccountIdAddressString(tokenAccountId);

			expect(result).toEqual(icrcAccount);
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
