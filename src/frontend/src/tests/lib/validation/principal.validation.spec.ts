import { PrincipalTextSchema } from '$lib/validation/principal.validation';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';

describe('PrincipalText', () => {
	it('should pass validation with a valid Principal string', () => {
		const result = PrincipalTextSchema.safeParse(mockPrincipalText);
		expect(result.success).toBe(true);
	});

	it('should fail validation with an invalid Principal string', () => {
		const invalidPrincipal = 'invalid-principal';
		const result = PrincipalTextSchema.safeParse(invalidPrincipal);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.errors[0].message).toBe('Invalid textual representation of a Principal.');
		}
	});

	it('should pass validation with an anonymous Principal', () => {
		const validPrincipal = Principal.anonymous().toText();
		const result = PrincipalTextSchema.safeParse(validPrincipal);
		expect(result.success).toBe(true);
	});

	it('should fail validation with a non-string input', () => {
		const invalidPrincipal = 12345;
		const result = PrincipalTextSchema.safeParse(invalidPrincipal);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.errors[0].message).toBe('Expected string, received number');
		}
	});
});
