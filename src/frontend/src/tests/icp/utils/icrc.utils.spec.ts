import { DEPRECATED_SNES } from '$env/tokens/tokens.sns.deprecated.env';
import { isDeprecatedSns, isNotDeprecated } from '$icp/utils/icrc.utils';

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

	describe('isNotDeprecated', () => {
		it.each(Object.keys(DEPRECATED_SNES))(
			"should return false for deprecated SNS with ledgerCanisterId '%s'",
			(ledgerCanisterId) => {
				expect(isNotDeprecated({ ledgerCanisterId })).toBeFalsy();
			}
		);

		it('should return true for non-deprecated SNS', () => {
			expect(isNotDeprecated({ ledgerCanisterId: 'zfcdd-tqaaa-aaaaq-aaaga-cai' })).toBeTruthy();
		});

		it('should return true for empty ledgerCanisterId', () => {
			expect(isNotDeprecated({ ledgerCanisterId: '' })).toBeTruthy();
		});
	});
});
