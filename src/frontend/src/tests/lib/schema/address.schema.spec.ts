import { Icrcv2AccountIdObjectSchema } from '$lib/schema/address.schema';
import { isNullish } from '@dfinity/utils';
import { Principal } from '@icp-sdk/core/principal';

describe('address.schema', () => {
	describe('Icrcv2AccountIdObjectSchema', () => {
		it('should validate ICP account identifiers', () => {
			// Valid ICP account identifier (example)
			const icpAccountId = '6c04faf793b42b156206f805d13ba1b3b697ec18f519e6a11484eed091859d5a';

			const result = Icrcv2AccountIdObjectSchema.safeParse(icpAccountId);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({
				Account: Buffer.from(icpAccountId, 'hex')
			});
		});

		it('should validate ICRC account addresses', () => {
			// Valid ICRC account address with principal and no subaccount
			const principal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');
			const icrcAccount = `${principal.toText()}`;

			const result = Icrcv2AccountIdObjectSchema.safeParse(icrcAccount);

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({
				WithPrincipal: {
					owner: principal,
					subaccount: []
				}
			});
		});

		it('should validate ICRC account addresses with subaccount', () => {
			// Valid ICRC account address with principal and subaccount
			// Compare: https://github.com/dfinity/ICRC-1/blob/main/standards/ICRC-1/TextualEncoding.md
			const icrcAccount =
				'k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae-6cc627i.1';

			const result = Icrcv2AccountIdObjectSchema.safeParse(icrcAccount);

			expect(result.success).toBeTruthy();
			expect(result.data).toBeDefined();

			if (isNullish(result.data) || !('WithPrincipal' in result.data)) {
				throw new Error('Missing key in data');
			}

			expect(result.data.WithPrincipal.owner.toString()).toEqual(
				'k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae'
			);
			expect(result.data.WithPrincipal.subaccount).toEqual([
				Uint8Array.from([
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					0, 1
				])
			]);
		});

		it('should fail validation for non-string values', () => {
			expect(Icrcv2AccountIdObjectSchema.safeParse(123).success).toBeFalsy();
			expect(Icrcv2AccountIdObjectSchema.safeParse(null).success).toBeFalsy();
			expect(Icrcv2AccountIdObjectSchema.safeParse(undefined).success).toBeFalsy();
			expect(Icrcv2AccountIdObjectSchema.safeParse({}).success).toBeFalsy();
		});

		it('should fail validation for invalid ICRC or ICP addresses', () => {
			// Invalid addresses
			const invalidAddresses = [
				'not-a-valid-principal', // Invalid principal format
				'rrkah-fqaaa-aaaaa-aaaaq-cai-invalidsubaccount', // Invalid subaccount format
				'a4c0c0d2b51d33f0e5a2b1e3e0f91e8e7d54609c5af5fa04e5c7c49e3ce8de9', // Too short for ICP account ID
				'a4c0c0d2b51d33f0e5a2b1e3e0f91e8e7d54609c5af5fa04e5c7c49e3ce8de9ez' // Invalid hex for ICP account ID
			];

			invalidAddresses.forEach((address) => {
				const result = Icrcv2AccountIdObjectSchema.safeParse(address);

				expect(result.success).toBeFalsy();
			});
		});
	});
});
