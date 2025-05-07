import { icTokenIcrcCustomToken } from '$icp/utils/icrc.utils';
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
});
