import { isTokenIcPunks } from '$icp/utils/icpunks.utils';
import type { TokenStandardCode } from '$lib/types/token';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';

describe('icpunks.utils', () => {
	describe('isTokenIcPunks', () => {
		it.each(['icpunks'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenIcPunks({
					...mockIcrcCustomToken,
					standard: { code: standard as TokenStandardCode }
				})
			).toBeTruthy();
		});

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIcPunks({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeFalsy();
			}
		);
	});
});
