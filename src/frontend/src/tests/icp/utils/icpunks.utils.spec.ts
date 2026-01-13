import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import type { IcPunksTokenWithoutId } from '$icp/types/icpunks-token';
import { isTokenIcPunks, mapIcPunksToken } from '$icp/utils/icpunks.utils';
import type { TokenStandardCode } from '$lib/types/token';
import { mockIcPunksCanisterId } from '$tests/mocks/icpunks-tokens.mock';
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

	describe('mapIcPunksToken', () => {
		const mockName = 'Mock ICPunks Token';
		const mockCanisterId = mockIcPunksCanisterId;
		const mockParams = {
			canisterId: mockCanisterId,
			metadata: { name: mockName }
		};

		const expected: IcPunksTokenWithoutId = {
			canisterId: mockCanisterId,
			network: ICP_NETWORK,
			name: mockName,
			symbol: mockName,
			decimals: 0,
			standard: { code: 'icpunks' },
			category: 'custom'
		};

		it('should correctly map an EXT token', () => {
			expect(mapIcPunksToken(mockParams)).toStrictEqual(expected);
		});

		it('should handle empty string as name', () => {
			expect(
				mapIcPunksToken({ ...mockParams, metadata: { ...mockParams.metadata, name: '' } })
			).toStrictEqual({
				...expected,
				name: '',
				symbol: ''
			});
		});
	});
});
