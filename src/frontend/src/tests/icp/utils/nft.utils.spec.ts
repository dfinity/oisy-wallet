import { metadata as getIcPunksMetadata } from '$icp/api/icpunks.api';
import { getExtMetadata } from '$icp/services/ext-metadata.services';
import { extIndexToIdentifier } from '$icp/utils/ext.utils';
import { mapDip721Nft, mapExtNft, mapIcPunksNft } from '$icp/utils/nft.utils';
import { NftMediaStatusEnum } from '$lib/schema/nft.schema';
import type { NftMetadataWithoutId } from '$lib/types/nft';
import { mapNftAttributes } from '$lib/utils/nft.utils';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockIcPunksMetadata } from '$tests/mocks/icpunks-token.mock';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { SvelteMap } from 'svelte/reactivity';

vi.mock(import('$icp/services/ext-metadata.services'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		getExtMetadata: vi.fn()
	};
});

vi.mock(import('$icp/api/icpunks.api'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		metadata: vi.fn()
	};
});

describe('nft.utils', () => {
	describe('mapExtNft', () => {
		const mockIndex = 123;

		const mockIdentifier = extIndexToIdentifier({
			collectionId: Principal.fromText(mockValidExtV2Token.canisterId),
			index: mockIndex
		});

		const mockMetadata: NftMetadataWithoutId = {
			imageUrl: 'https://example.com/image.png',
			thumbnailUrl: 'https://example.com/thumbnail.png'
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(SvelteMap.prototype, 'get').mockReturnValue(undefined); // invalidate cache

			global.fetch = vi.fn().mockResolvedValue({
				headers: {
					get: () => null
				}
			});

			vi.mocked(getExtMetadata).mockResolvedValue(mockMetadata);
		});

		it('should map correctly an EXT NFT', async () => {
			const result = await mapExtNft({
				index: mockIndex,
				token: mockValidExtV2Token,
				identity: mockIdentity
			});

			const { canisterId: _, ...rest } = mockValidExtV2Token;

			expect(result).toStrictEqual({
				id: result.id,
				oisyId: (mockIndex + 1).toString(),
				imageUrl: mockMetadata.imageUrl,
				thumbnailUrl: mockMetadata.thumbnailUrl,
				mediaStatus: {
					image: NftMediaStatusEnum.OK,
					thumbnail: NftMediaStatusEnum.OK
				},
				collection: {
					...rest,
					address: mockValidExtV2Token.canisterId
				}
			});
		});

		it('should handle correctly empty metadata from the service', async () => {
			vi.mocked(getExtMetadata).mockResolvedValue(undefined);

			const result = await mapExtNft({
				index: mockIndex,
				token: mockValidExtV2Token,
				identity: mockIdentity
			});

			const { canisterId: _, ...rest } = mockValidExtV2Token;

			expect(result).toStrictEqual({
				id: result.id,
				oisyId: (mockIndex + 1).toString(),
				imageUrl: `https://${mockValidExtV2Token.canisterId}.raw.icp0.io/?tokenid=${mockIdentifier}`,
				thumbnailUrl: `https://${mockValidExtV2Token.canisterId}.raw.icp0.io/?tokenid=${mockIdentifier}&type=thumbnail`,
				mediaStatus: {
					image: NftMediaStatusEnum.OK,
					thumbnail: NftMediaStatusEnum.OK
				},
				collection: {
					...rest,
					address: mockValidExtV2Token.canisterId
				}
			});
		});

		it('should raise an error if the index is negative', async () => {
			await expect(
				mapExtNft({ index: -1, token: mockValidExtV2Token, identity: mockIdentity })
			).rejects.toThrowError('EXT token index -1 is out of bounds');
		});
	});

	describe('mapDip721Nft', () => {
		const mockIndex = 123n;

		it('should map correctly a DIP721 NFT', () => {
			const result = mapDip721Nft({
				index: mockIndex,
				token: mockValidDip721Token
			});

			const { canisterId: _, ...rest } = mockValidDip721Token;

			expect(result).toStrictEqual({
				id: result.id,
				mediaStatus: {
					image: NftMediaStatusEnum.INVALID_DATA,
					thumbnail: NftMediaStatusEnum.INVALID_DATA
				},
				collection: {
					...rest,
					address: mockValidDip721Token.canisterId
				}
			});
		});
	});

	describe('mapIcPunksNft', () => {
		const mockIndex = 123n;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(SvelteMap.prototype, 'get').mockReturnValue(undefined); // invalidate cache

			global.fetch = vi.fn().mockResolvedValue({
				headers: {
					get: () => null
				}
			});

			vi.mocked(getIcPunksMetadata).mockResolvedValue(mockIcPunksMetadata);
		});

		it('should map correctly an ICPunks NFT', async () => {
			const result = await mapIcPunksNft({
				index: mockIndex,
				token: mockValidIcPunksToken,
				identity: mockIdentity
			});

			const { canisterId: _, ...rest } = mockValidIcPunksToken;

			expect(result).toStrictEqual({
				id: result.id,
				name: mockIcPunksMetadata.name,
				description: mockIcPunksMetadata.desc,
				imageUrl: `https://${mockValidIcPunksToken.canisterId}.raw.icp0.io${mockIcPunksMetadata.url}`,
				mediaStatus: {
					image: NftMediaStatusEnum.OK,
					thumbnail: NftMediaStatusEnum.INVALID_DATA
				},
				attributes: mapNftAttributes(
					mockIcPunksMetadata.properties.map(({ name: trait_type, value }) => ({
						trait_type,
						value
					}))
				),
				collection: {
					...rest,
					address: mockValidIcPunksToken.canisterId
				}
			});
		});

		it('should handle correctly an empty description', async () => {
			vi.mocked(getIcPunksMetadata).mockResolvedValue({ ...mockIcPunksMetadata, desc: '' });

			const result = await mapIcPunksNft({
				index: mockIndex,
				token: mockValidIcPunksToken,
				identity: mockIdentity
			});

			const { canisterId: _, ...rest } = mockValidIcPunksToken;

			expect(result).toStrictEqual({
				id: result.id,
				name: mockIcPunksMetadata.name,
				imageUrl: `https://${mockValidIcPunksToken.canisterId}.raw.icp0.io${mockIcPunksMetadata.url}`,
				mediaStatus: {
					image: NftMediaStatusEnum.OK,
					thumbnail: NftMediaStatusEnum.INVALID_DATA
				},
				attributes: mapNftAttributes(
					mockIcPunksMetadata.properties.map(({ name: trait_type, value }) => ({
						trait_type,
						value
					}))
				),
				collection: {
					...rest,
					address: mockValidIcPunksToken.canisterId
				}
			});
		});
	});
});
