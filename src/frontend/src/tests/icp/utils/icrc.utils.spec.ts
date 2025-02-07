import { DEPRECATED_SNES } from '$env/tokens/tokens.sns.deprecated.env';
import { isDeprecatedSns } from '$icp/utils/icrc.utils';

describe('icrc.utils', () => {
	describe('isDeprecatedSns', () => {
		it.each(Object.keys(DEPRECATED_SNES))(
			"should return true for deprecated SNS with ledgerCanisterId '%s'",
			(ledgerCanisterId) => {
				expect(isDeprecatedSns({ ledgerCanisterId })).toBeTruthy();
			}
		);

		it('should return false for non-deprecated SNS', () => {
			expect(isDeprecatedSns({ ledgerCanisterId: 'zfcdd-tqaaa-aaaaq-aaaga-cai' })).toBeFalsy();
		});

		it('should return false for empty ledgerCanisterId', () => {
			expect(isDeprecatedSns({ ledgerCanisterId: '' })).toBeFalsy();
		});
	});
});
