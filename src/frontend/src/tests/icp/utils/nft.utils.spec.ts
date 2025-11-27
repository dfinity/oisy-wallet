import { mapExtNft } from '$icp/utils/nft.utils';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';

describe('nft.utils', () => {
	describe('mapExtNft', () => {
		it('should map correctly an EXT NFT', () => {
			const result = mapExtNft({ index: 123, token: mockValidExtV2Token });

			const { canisterId: _, ...rest } = mockValidExtV2Token;

			expect(mapExtNft({ index: 123, token: mockValidExtV2Token })).toStrictEqual({
				id: result.id,
				imageUrl: `https://${mockValidExtV2Token.canisterId}.raw.icp0.io/?index=123`,
				collection: {
					...rest,
					address: mockValidExtV2Token.canisterId
				}
			});
		});

		it('should raise an error if the index is negative', () => {
			expect(() => mapExtNft({ index: -1, token: mockValidExtV2Token })).toThrow(
				'EXT token index -1 is out of bounds'
			);
		});
	});
});
