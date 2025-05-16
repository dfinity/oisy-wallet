import type { TokenAccountId } from '$declarations/backend/backend.did';
import { TokenAccountIdSchema } from '$lib/schema/token-account-id.schema';
import { getAddressString } from '$lib/utils/token-account-id.utils';
import { Principal } from '@dfinity/principal';

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

		it('should extract address string from ICRCV2 token account ID with Account type', () => {
			const icpAccountIdStr = '6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a';
			const tokenAccountId = TokenAccountIdSchema.parse(icpAccountIdStr);

			const result = getAddressString(tokenAccountId);

			expect(result).toEqual(icpAccountIdStr);
		});

		it('should extract address string from ICRCV2 token account ID with WithPrincipal type', () => {
			const principalStr = 'rrkah-fqaaa-aaaaa-aaaaq-cai';
			const tokenAccountId = TokenAccountIdSchema.parse(principalStr);

			const result = getAddressString(tokenAccountId);

			expect(result).toEqual(principalStr);
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

		it('should handle ICRCV2 token account ID in a roundtrip conversion', () => {
			const principal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
			const principalStr = principal.toString();
			const tokenAccountId = TokenAccountIdSchema.parse(principalStr);

			const result = getAddressString(tokenAccountId);

			expect(result).toEqual(principalStr);
		});
	});
});
