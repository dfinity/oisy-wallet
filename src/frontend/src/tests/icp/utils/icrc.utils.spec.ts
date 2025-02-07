import { DEPRECATED_SNES } from '$env/tokens/tokens.sns.deprecated.env';
import { isDeprecatedSns, isNotDeprecatedSns } from '$icp/utils/icrc.utils';

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

	describe('isNotDeprecatedSns', () => {
		it.each(Object.keys(DEPRECATED_SNES))(
			"should return false for deprecated SNS with ledgerCanisterId '%s'",
			(ledgerCanisterId) => {
				expect(isNotDeprecatedSns({ ledgerCanisterId })).toBeFalsy();
			}
		);

		it('should return true for non-deprecated SNS', () => {
			expect(isNotDeprecatedSns({ ledgerCanisterId: 'zfcdd-tqaaa-aaaaq-aaaga-cai' })).toBeTruthy();
		});

		it('should return true for empty ledgerCanisterId', () => {
			expect(isNotDeprecatedSns({ ledgerCanisterId: '' })).toBeTruthy();
		});
	});
});
