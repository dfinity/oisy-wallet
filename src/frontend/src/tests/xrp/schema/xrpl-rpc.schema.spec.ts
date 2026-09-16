import { XrpDropsSchema, XrplAccountInfoResponseSchema } from '$xrp/schema/xrpl-rpc.schema';

describe('xrpl-rpc.schema', () => {
	describe('XrpDropsSchema', () => {
		it('should validate unsigned decimal drop strings', () => {
			['0', '1', '25000000'].forEach((drops) => {
				const result = XrpDropsSchema.safeParse(drops);

				expect(result.success).toBeTruthy();
				expect(result.data).toEqual(drops);
			});
		});

		// `BigInt` alone would accept every one of these and hand back a plausible balance.
		it('should fail validation for signed, hexadecimal, fractional and numeric forms', () => {
			[1, '-1', '0x10', '1.5', '1e3', '', ' 1'].forEach((drops) => {
				expect(XrpDropsSchema.safeParse(drops).success).toBeFalsy();
			});
		});
	});

	describe('XrplAccountInfoResponseSchema', () => {
		it('should validate a funded account response', () => {
			const result = XrplAccountInfoResponseSchema.safeParse({
				result: { account_data: { Balance: '25000000' } }
			});

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ result: { account_data: { Balance: '25000000' } } });
		});

		it('should validate an error response', () => {
			const result = XrplAccountInfoResponseSchema.safeParse({
				result: { error: 'actNotFound' }
			});

			expect(result.success).toBeTruthy();
			expect(result.data).toEqual({ result: { error: 'actNotFound' } });
		});

		// The union branches must be mutually exclusive. Zod strips unknown keys and returns the
		// first branch that parses, so an ambiguous response would otherwise validate as a balance
		// with the error discarded.
		it('should fail validation for a response carrying both account_data and an error', () => {
			expect(
				XrplAccountInfoResponseSchema.safeParse({
					result: { account_data: { Balance: '1' }, error: 'actNotFound' }
				}).success
			).toBeFalsy();
		});

		it('should fail validation for a response with neither account_data nor an error', () => {
			expect(XrplAccountInfoResponseSchema.safeParse({ result: {} }).success).toBeFalsy();
		});

		it('should fail validation for a missing result', () => {
			expect(XrplAccountInfoResponseSchema.safeParse({}).success).toBeFalsy();
		});
	});
});
