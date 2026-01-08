import { isTokenDip721 } from '$icp/utils/dip721.utils';
import type { TokenStandardCode } from '$lib/types/token';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';

describe('dip721.utils', () => {
	describe('isTokenDip721', () => {
		it.each(['dip721'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenDip721({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
			).toBeTruthy();
		});

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenDip721({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeFalsy();
			}
		);
	});
});
