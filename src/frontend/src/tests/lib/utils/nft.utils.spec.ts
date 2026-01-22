import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import type { Option } from '$lib/types/utils';
import {
	getNftDisplayId,
	getNftDisplayImageUrl,
	getNftDisplayMediaStatus,
	getNftDisplayName,
	getNftIdentifier,
	getTokensByNetwork,
	isTokenFungible,
	isTokenNonFungible,
	mapNftAttributes
} from '$lib/utils/nft.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import { MOCK_ERC1155_TOKENS, NYAN_CAT_TOKEN } from '$tests/mocks/erc1155-tokens.mock';
import {
	AZUKI_ELEMENTAL_BEANS_TOKEN,
	DE_GODS_TOKEN,
	MOCK_ERC721_TOKENS,
	PUDGY_PENGUINS_TOKEN
} from '$tests/mocks/erc721-tokens.mock';
import { MOCK_EXT_TOKENS, mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockValidErc721Nft } from '$tests/mocks/nfts.mock';

describe('nft.utils', () => {
	describe('isTokenNonFungible', () => {
		it.each([...MOCK_ERC721_TOKENS, ...MOCK_ERC1155_TOKENS, ...MOCK_EXT_TOKENS])(
			'should return true for token $name',
			(token) => {
				expect(isTokenNonFungible(token)).toBeTruthy();
			}
		);

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenNonFungible(token)).toBeFalsy();
		});
	});

	describe('isTokenFungible', () => {
		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS
		])('should return true for token $name', (token) => {
			expect(isTokenFungible(token)).toBeTruthy();
		});

		it.each([...MOCK_ERC721_TOKENS, ...MOCK_ERC1155_TOKENS, ...MOCK_EXT_TOKENS])(
			'should return false for token $name',
			(token) => {
				expect(isTokenFungible(token)).toBeFalsy();
			}
		);
	});

	describe('getTokensByNetwork', () => {
		it('should return an empty map if no tokens are provided', () => {
			const result = getTokensByNetwork([]);

			expect(result.size).toEqual(0);
		});

		it('should return the tokens grouped by networks', () => {
			const result = getTokensByNetwork([
				AZUKI_ELEMENTAL_BEANS_TOKEN,
				DE_GODS_TOKEN,
				PUDGY_PENGUINS_TOKEN
			]);

			expect(result.size).toEqual(2);

			const polygonTokens = result.get(POLYGON_AMOY_NETWORK.id);

			expect(polygonTokens).toBeDefined();
			expect(polygonTokens).toHaveLength(2);
			expect(polygonTokens).toContain(AZUKI_ELEMENTAL_BEANS_TOKEN);
			expect(polygonTokens).toContain(DE_GODS_TOKEN);

			const ethereumTokens = result.get(ETHEREUM_NETWORK.id);

			expect(ethereumTokens).toBeDefined();
			expect(ethereumTokens).toHaveLength(1);
			expect(ethereumTokens).toContain(PUDGY_PENGUINS_TOKEN);
		});
	});

	describe('getNftIdentifier', () => {
		it('should return the token identifier for ERC721 tokens', () => {
			expect(getNftIdentifier(AZUKI_ELEMENTAL_BEANS_TOKEN)).toBe(
				AZUKI_ELEMENTAL_BEANS_TOKEN.address
			);
		});

		it('should return the token identifier for ERC1155 tokens', () => {
			expect(getNftIdentifier(NYAN_CAT_TOKEN)).toBe(NYAN_CAT_TOKEN.address);
		});

		it('should return the canisterId for EXT tokens', () => {
			expect(getNftIdentifier(mockValidExtV2Token)).toBe(mockValidExtV2Token.canisterId);
		});

		it('should return the canisterId for DIP721 tokens', () => {
			expect(getNftIdentifier(mockValidDip721Token)).toBe(mockValidDip721Token.canisterId);
		});

		it('should return the canisterId for ICPunks tokens', () => {
			expect(getNftIdentifier(mockValidIcPunksToken)).toBe(mockValidIcPunksToken.canisterId);
		});
	});

	describe('getNftDisplayId', () => {
		const mockOisyId = parseNftId('mock-oisy-id');

		it('should use the OISY NFT ID if defined', () => {
			expect(getNftDisplayId({ ...mockValidErc721Nft, oisyId: mockOisyId })).toBe(mockOisyId);
		});

		it('should fallback to the normal ID if OISY ID is not defined', () => {
			expect(getNftDisplayId(mockValidErc721Nft)).toBe(mockValidErc721Nft.id);
		});
	});

	describe('getNftDisplayImageUrl', () => {
		const mockThumbnailUrl = 'http://example.com/thumbnail.png';

		it('should use the thumbnail URL if defined', () => {
			expect(getNftDisplayImageUrl({ ...mockValidErc721Nft, thumbnailUrl: mockThumbnailUrl })).toBe(
				mockThumbnailUrl
			);
		});

		it('should fallback to the image URL if thumbnail is not defined', () => {
			expect(getNftDisplayImageUrl(mockValidErc721Nft)).toBe(mockValidErc721Nft.imageUrl);
		});
	});

	describe('getNftDisplayMediaStatus', () => {
		const mockThumbnailUrl = 'http://example.com/thumbnail.png';

		it('should use the thumbnail status if it is defined', () => {
			expect(
				getNftDisplayMediaStatus({ ...mockValidErc721Nft, thumbnailUrl: mockThumbnailUrl })
			).toBe(mockValidErc721Nft.mediaStatus.thumbnail);
		});

		it('should fallback to the image status if thumbnail is not defined', () => {
			expect(getNftDisplayMediaStatus(mockValidErc721Nft)).toBe(
				mockValidErc721Nft.mediaStatus.image
			);
		});
	});

	describe('getNftDisplayName', () => {
		it('should use the NFT name if defined', () => {
			expect(
				getNftDisplayName({ ...mockValidErc721Nft, id: parseNftId('123'), name: 'mock-name #123' })
			).toBe('mock-name #123');
		});

		it('should append the ID to the NFT name if it is not there', () => {
			expect(
				getNftDisplayName({ ...mockValidErc721Nft, id: parseNftId('456'), name: 'mock-name #123' })
			).toBe('mock-name #123 #456');
		});

		it('should use the collection name if the name is not defined', () => {
			expect(
				getNftDisplayName({
					...mockValidErc721Nft,
					id: parseNftId('123'),
					name: undefined,
					collection: { ...mockValidErc721Nft.collection, name: 'mock-collection-name' }
				})
			).toBe('mock-collection-name #123');
		});

		it('should fallback to the ID', () => {
			expect(
				getNftDisplayName({
					...mockValidErc721Nft,
					id: parseNftId('123'),
					name: undefined,
					collection: { ...mockValidErc721Nft.collection, name: undefined }
				})
			).toBe('#123');
		});
	});

	describe('mapNftAttributes', () => {
		it('should return an empty array for nullish inputs', () => {
			expect(mapNftAttributes(undefined)).toStrictEqual([]);

			expect(mapNftAttributes(null)).toStrictEqual([]);
		});

		it('should map NFT attributes correctly (input as list)', () => {
			const mockAttributes: {
				trait_type: string;
				value?: Option<string | number | boolean>;
			}[] = [
				{ trait_type: 'Color', value: 'Blue' },
				{ trait_type: 'Size', value: 'Large' },
				{ trait_type: 'Tall', value: false },
				{ trait_type: 'Arms', value: 2 },
				{ trait_type: 'Legs', value: undefined },
				{ trait_type: 'Hair', value: null },
				{ trait_type: 'Eyes' }
			];

			const mappedAttributes = mapNftAttributes(mockAttributes);

			expect(mappedAttributes).toStrictEqual([
				{ traitType: 'Color', value: 'Blue' },
				{ traitType: 'Size', value: 'Large' },
				{ traitType: 'Tall', value: 'false' },
				{ traitType: 'Arms', value: '2' },
				{ traitType: 'Legs' },
				{ traitType: 'Hair' },
				{ traitType: 'Eyes' }
			]);
		});

		it('should map NFT attributes correctly (input as object)', () => {
			const mockAttributes: Record<string, Option<string | number | boolean>> = {
				Color: 'Blue',
				Size: 'Large',
				Tall: false,
				Arms: 2,
				Legs: undefined,
				Hair: null,
				Eyes: undefined
			};

			const mappedAttributes = mapNftAttributes(mockAttributes);

			expect(mappedAttributes).toStrictEqual([
				{ traitType: 'Color', value: 'Blue' },
				{ traitType: 'Size', value: 'Large' },
				{ traitType: 'Tall', value: 'false' },
				{ traitType: 'Arms', value: '2' },
				{ traitType: 'Legs' },
				{ traitType: 'Hair' },
				{ traitType: 'Eyes' }
			]);
		});

		it('should return an empty array for inputs without attributes', () => {
			expect(mapNftAttributes([])).toStrictEqual([]);

			expect(mapNftAttributes({})).toStrictEqual([]);
		});

		it('should handle gracefully unsupported input types', () => {
			// @ts-expect-error Testing an unsupported input type
			expect(mapNftAttributes('invalid-input')).toStrictEqual([]);

			// @ts-expect-error Testing an unsupported input type
			expect(mapNftAttributes(123)).toStrictEqual([]);

			// @ts-expect-error Testing an unsupported input type
			expect(mapNftAttributes(456n)).toStrictEqual([]);
		});
	});
});
