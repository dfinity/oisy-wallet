import { isTokenExtV2 } from '$icp/utils/ext-v2.utils';
import type { TokenStandard } from '$lib/types/token';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';

describe('ext-v2.utils', () => {
	describe('isTokenExtV2', () => {
		it.each(['extV2'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenExtV2({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
			).toBeTruthy();
		});

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenExtV2({ ...mockIcrcCustomToken, standard: standard as TokenStandard })
				).toBeFalsy();
			}
		);
	});
});
