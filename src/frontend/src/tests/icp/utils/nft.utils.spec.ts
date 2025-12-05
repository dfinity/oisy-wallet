import { mapExtNft } from '$icp/utils/nft.utils';
import { NftMediaStatusEnum } from '$lib/schema/nft.schema';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { SvelteMap } from 'svelte/reactivity';

describe('nft.utils', () => {
	describe('mapExtNft', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(SvelteMap.prototype, 'get').mockReturnValue(undefined); // invalidate cache

			global.fetch = vi.fn().mockResolvedValue({
				headers: {
					get: () => null
				}
			});
		});

		it('should map correctly an EXT NFT', async () => {
			const mockIndex = 123;

			const result = await mapExtNft({ index: mockIndex, token: mockValidExtV2Token });

			const { canisterId: _, ...rest } = mockValidExtV2Token;

			expect(result).toStrictEqual({
				id: result.id,
				oisyId: (mockIndex + 1).toString(),
				name: `${mockValidExtV2Token.name} #${mockIndex + 1}`,
				imageUrl: `https://${mockValidExtV2Token.canisterId}.raw.icp0.io/?index=123`,
				thumbnailUrl: `https://${mockValidExtV2Token.canisterId}.raw.icp0.io/?index=123&type=thumbnail`,
				mediaStatus: NftMediaStatusEnum.OK,
				collection: {
					...rest,
					address: mockValidExtV2Token.canisterId
				}
			});
		});

		it('should raise an error if the index is negative', async () => {
			await expect(mapExtNft({ index: -1, token: mockValidExtV2Token })).rejects.toThrow(
				'EXT token index -1 is out of bounds'
			);
		});
	});
});
