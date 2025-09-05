import type { Icrcv2AccountId } from '$declarations/backend/backend.did';
import {
	getIcrcv2AccountIdString,
	parseIcrcv2AccountId,
	tryToParseIcrcAccountStringToAccountIdentifierText
} from '$icp/utils/icp-account.utils';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { encodeIcrcAccount } from '@dfinity/ledger-icrc';
import { Principal } from '@dfinity/principal';
import { isNullish } from '@dfinity/utils';

describe('icp-account.utils', () => {
	describe('parseIcrcv2AccountId', () => {
		it('should parse ICP account identifiers', () => {
			// Valid ICP account identifier (example)
			const icpAccountId = '6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a';

			const result = parseIcrcv2AccountId(icpAccountId);

			expect(result).toEqual({
				Account: Buffer.from(icpAccountId, 'hex')
			});
		});

		it('should parse ICRC account addresses with principal and no subaccount', () => {
			// Valid ICRC account address with principal and no subaccount
			const principal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
			const icrcAccount = `${principal.toText()}`;

			const result = parseIcrcv2AccountId(icrcAccount);

			expect(result).toEqual({
				WithPrincipal: {
					owner: principal,
					subaccount: []
				}
			});
		});

		it('should parse ICRC account addresses with subaccount', () => {
			// Valid ICRC account address with principal and subaccount
			// Compare: https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-1/TextualEncoding.md
			const icrcAccount =
				'k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae-6cc627i.1';

			const result = parseIcrcv2AccountId(icrcAccount);

			expect(result).toBeDefined();

			if (!result || !('WithPrincipal' in result)) {
				throw new Error('Missing key in data');
			}

			expect(result.WithPrincipal.owner.toString()).toEqual(
				'k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae'
			);
			expect(result.WithPrincipal.subaccount).toHaveLength(1);

			// Check that the subaccount is a Uint8Array with the last byte set to 1
			const [subaccount] = result.WithPrincipal.subaccount;

			expect(subaccount).toBeDefined();

			if (!subaccount) {
				throw new Error('Subaccount is undefined');
			}

			expect(subaccount).toBeInstanceOf(Uint8Array);

			expect(subaccount).toHaveLength(32);

			expect(subaccount[31]).toBe(1);

			// All other bytes should be 0
			for (let i = 0; i < 31; i++) {
				expect(subaccount[i]).toBe(0);
			}
		});

		it('should return undefined for invalid ICP or ICRC addresses', () => {
			// Invalid addresses
			const invalidAddresses = [
				'not-a-valid-principal', // Invalid principal format
				'rrkah-fqaaa-aaaaa-aaaaq-cai-invalidsubaccount', // Invalid subaccount format
				'a4c0c0d2b51d33f0e5a2b1e3e0f91e8e7d54609c5af5fa04e5c7c49e3ce8de9', // Too short for ICP account ID
				'a4c0c0d2b51d33f0e5a2b1e3e0f91e8e7d54609c5af5fa04e5c7c49e3ce8de9ez' // Invalid hex for ICP account ID
			];

			invalidAddresses.forEach((address) => {
				const result = parseIcrcv2AccountId(address);

				expect(result).toBeUndefined();
			});
		});

		it('should return undefined for non-string inputs', () => {
			// @ts-expect-error Testing invalid input types
			expect(parseIcrcv2AccountId(123)).toBeUndefined();
			// @ts-expect-error Testing invalid input types
			expect(parseIcrcv2AccountId(null)).toBeUndefined();
			// @ts-expect-error Testing invalid input types
			expect(parseIcrcv2AccountId(undefined)).toBeUndefined();
			// @ts-expect-error Testing invalid input types
			expect(parseIcrcv2AccountId({})).toBeUndefined();
		});
	});

	describe('getIcrcv2AccountIdString', () => {
		it('should extract string from Account type', () => {
			const accountIdStr = '6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a';
			const accountIdObj: Icrcv2AccountId = {
				Account: Buffer.from(accountIdStr, 'hex')
			};

			const result = getIcrcv2AccountIdString(accountIdObj);

			expect(result).toEqual(accountIdStr);
		});

		it('should extract string from WithPrincipal type with no subaccount', () => {
			const principal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
			const accountIdObj: Icrcv2AccountId = {
				WithPrincipal: {
					owner: principal,
					subaccount: []
				}
			};

			const result = getIcrcv2AccountIdString(accountIdObj);

			expect(result).toEqual(principal.toString());
		});

		it('should extract string from WithPrincipal type with subaccount', () => {
			const principal = Principal.fromText(
				'k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae'
			);
			const subaccount = new Uint8Array(32);
			subaccount[31] = 1; // Set the last byte to 1

			const accountIdObj: Icrcv2AccountId = {
				WithPrincipal: {
					owner: principal,
					subaccount: [subaccount]
				}
			};

			const result = getIcrcv2AccountIdString(accountIdObj);

			expect(result).toEqual(`${principal.toString()}-6cc627i.1`);
		});

		it('should return undefined for invalid Icrcv2AccountId objects', () => {
			// @ts-expect-error Testing invalid input
			expect(() => getIcrcv2AccountIdString({})).toThrow();
			// @ts-expect-error Testing invalid input
			expect(() => getIcrcv2AccountIdString({ InvalidType: 'address' })).toThrow();
		});
	});

	describe('roundtrip conversion', () => {
		it('should preserve ICP account identifiers when parsing and then getting the string', () => {
			const originalAddress = '6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a';

			const parsedAddress = parseIcrcv2AccountId(originalAddress);

			if (isNullish(parsedAddress)) {
				throw new Error('Parsing failed');
			}
			const recoveredAddress = getIcrcv2AccountIdString(parsedAddress);

			expect(recoveredAddress).toEqual(originalAddress);
		});

		it('should preserve ICRC account addresses with principal when parsing and then getting the string', () => {
			const principal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
			const originalAddress = principal.toString();

			const parsedAddress = parseIcrcv2AccountId(originalAddress);
			if (isNullish(parsedAddress)) {
				throw new Error('Parsing failed');
			}
			const recoveredAddress = getIcrcv2AccountIdString(parsedAddress);

			expect(recoveredAddress).toEqual(originalAddress);
		});

		it('should preserve ICRC account addresses with subaccount when parsing and then getting the string', () => {
			const originalAddress =
				'k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae-6cc627i.1';

			const parsedAddress = parseIcrcv2AccountId(originalAddress);
			if (isNullish(parsedAddress)) {
				throw new Error('Parsing failed');
			}
			const recoveredAddress = getIcrcv2AccountIdString(parsedAddress);

			expect(recoveredAddress).toEqual(originalAddress);
		});

		it('should handle all valid ICP address types in a roundtrip conversion', () => {
			const validAddresses = [
				'6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a', // ICP account ID
				'rrkah-fqaaa-aaaaa-aaaaq-cai', // Principal only
				'k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae-6cc627i.1' // Principal with subaccount
			];

			validAddresses.forEach((address) => {
				const parsedAddress = parseIcrcv2AccountId(address);
				if (isNullish(parsedAddress)) {
					throw new Error('Parsing failed');
				}
				const recoveredAddress = getIcrcv2AccountIdString(parsedAddress);

				expect(recoveredAddress).toEqual(address);
			});
		});
	});

	describe('tryToParseIcrcAccountStringToAccountIdentifierText', () => {
		it('should return a correct account identifier text for account without subaccount', () => {
			expect(
				tryToParseIcrcAccountStringToAccountIdentifierText(
					encodeIcrcAccount({ owner: mockPrincipal })
				)
			).toEqual('97783b7f0f34634c06ced774bd1bd27d2c76e80b0dd88f56ad55b3ecab292f68');
		});

		it('should return a correct account identifier text for account with subaccount', () => {
			const subaccount = new Uint8Array(32);
			subaccount[31] = 1; // Set the last byte to 1

			expect(
				tryToParseIcrcAccountStringToAccountIdentifierText(
					encodeIcrcAccount({
						owner: mockPrincipal,
						subaccount
					})
				)
			).toEqual('453705c03b4faebe09d6f9b1f5bad842f6006cd75650ef83aa3adc8a09a63547');
		});

		it('should return undefined if the provided address failed to be parsed', () => {
			expect(tryToParseIcrcAccountStringToAccountIdentifierText('test')).toEqual(undefined);
		});
	});
});
