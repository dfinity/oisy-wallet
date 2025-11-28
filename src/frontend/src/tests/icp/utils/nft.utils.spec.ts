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
			const result = await mapExtNft({ index: 123, token: mockValidExtV2Token });

			const { canisterId: _, ...rest } = mockValidExtV2Token;

			expect(result).toStrictEqual({
				id: result.id,
				imageUrl: `https://${mockValidExtV2Token.canisterId}.raw.icp0.io/?index=123`,
				mediaStatus: NftMediaStatusEnum.OK,
				collection: {
					...rest,
					address: mockValidExtV2Token.canisterId
				}
			});
		});
	});
});
