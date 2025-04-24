import { DEPRECATED_SNES } from '$env/tokens/tokens.sns.deprecated.env';
import { icTokenIcrcCustomToken, isDeprecatedSns, isNotDeprecatedSns } from '$icp/utils/icrc.utils';
import type { TokenStandard } from '$lib/types/token';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';

describe('icrc.utils', () => {
	describe('icTokenIcrcCustomToken', () => {
		it.each(['icp', 'icrc'])('should return true for valid token standards: %s', (standard) => {
			expect(
				icTokenIcrcCustomToken({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
			).toBeTruthy();
		});

		it.each(['ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					icTokenIcrcCustomToken({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
				).toBeFalsy();
			}
		);

		it('should return true is the token has the prop `enabled`', () => {
			expect(icTokenIcrcCustomToken({ ...mockIcrcCustomToken, enabled: true })).toBeTruthy();

			expect(icTokenIcrcCustomToken({ ...mockIcrcCustomToken, enabled: false })).toBeTruthy();
		});

		it('should return false is the token has no prop `enabled`', () => {
			const { enabled: _, ...mockIcrcCustomTokenWithoutEnabled } = mockIcrcCustomToken;

			expect(icTokenIcrcCustomToken(mockIcrcCustomTokenWithoutEnabled)).toBeFalsy();
		});
	});

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
