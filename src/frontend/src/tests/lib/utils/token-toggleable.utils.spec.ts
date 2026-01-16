import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';




describe('token-toggleable.utils', () => {
	describe('isTokenToggleable', () => {
		it('should return true if token has property `enabled`', () => {
			expect(isTokenToggleable({ ...ICP_TOKEN, enabled: true })).toBeTruthy();

			expect(isTokenToggleable({ ...ICP_TOKEN, enabled: false })).toBeTruthy();

			expect(isTokenToggleable({ ...ICP_TOKEN, enabled: undefined })).toBeTruthy();

			expect(isTokenToggleable({ ...ICP_TOKEN, enabled: null })).toBeTruthy();
		});

		it('should return false if token has no property `enabled`', () => {
			expect(isTokenToggleable(ICP_TOKEN)).toBeFalsy();
		});

		it('should return true if token has property `enabled` even if not boolean', () => {
			expect(isTokenToggleable({ ...ICP_TOKEN, enabled: 123 })).toBeTruthy();

			expect(isTokenToggleable({ ...ICP_TOKEN, enabled: 'random-string' })).toBeTruthy();

			expect(isTokenToggleable({ ...ICP_TOKEN, enabled: {} })).toBeTruthy();
		});
	});
});
