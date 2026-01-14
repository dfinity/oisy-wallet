import { isTokenIcNft } from '$icp/utils/ic-nft.utils';
import type { TokenStandardCode } from '$lib/types/token';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';

describe('ic-nft.utils', () => {
	describe('isTokenIcNft', () => {
		it.each(['ext', 'dip721', 'icpunks'])(
			'should return true for valid token standards: %s',
			(standard) => {
				expect(
					isTokenIcNft({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeTruthy();
			}
		);

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIcNft({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeFalsy();
			}
		);
	});
});
