import { EURC_TOKEN } from '$env/tokens/tokens-erc20/tokens.eurc.env';
import { fetchMetadataFromUri } from '$eth/services/erc.services';
import { InvalidMetadataImageUrl, InvalidTokenUri } from '$lib/types/errors';
import * as nftsUtils from '$lib/utils/nfts.utils';
import { parseMetadataResourceUrl } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';

global.fetch = vi.fn();

describe('erc.services', () => {
	describe('fetchMetadataFromUri', () => {
		const contractAddress = EURC_TOKEN.address;
		const tokenId = parseNftId(12345);
		const metadataUrl = 'ipfs://metadata-hash';
		const expectedMetadataUrl = new URL('https://ipfs.io/ipfs/metadata-hash');

		const mockParams = {
			metadataUrl,
			contractAddress,
			tokenId
		};

		const mockMetadataResponse = {
			name: 'Asset Name',
			description: 'Lorem ipsum...',
			image: `https://s3.amazonaws.com/your-bucket/images/${tokenId}.png`,
			properties: {
				simple_property: 'example value',
				rich_property: {
					name: 'Name',
					value: '123',
					display_value: '123 Example Value',
					class: 'emphasis',
					css: {
						color: '#ffffff',
						'font-weight': 'bold',
						'text-decoration': 'underline'
					}
				},
				array_property: {
					name: 'Name',
					value: [1, 2, 3, 4],
					class: 'emphasis'
				}
			}
		};

		const mockFetch = vi.mocked(fetch);

		beforeEach(() => {
			vi.clearAllMocks();

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => mockMetadataResponse
			} as unknown as Response);

			vi.spyOn(nftsUtils, 'parseMetadataResourceUrl');
		});

		it('should return undefined if metadata URL is nullish', async () => {
			const result = await fetchMetadataFromUri({
				...mockParams,
				metadataUrl: undefined
			});

			expect(result).toEqual({ metadata: undefined, imageUrl: undefined });
		});

		it('should fetch metadata', async () => {
			const result = await fetchMetadataFromUri(mockParams);

			expect(mockFetch).toHaveBeenCalledExactlyOnceWith(expectedMetadataUrl);

			expect(result).toEqual({
				metadata: mockMetadataResponse,
				imageUrl: new URL(mockMetadataResponse.image)
			});
		});

		it('should return undefined if metadata JSON is nullish', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => undefined
			} as unknown as Response);

			const result = await fetchMetadataFromUri(mockParams);

			expect(result).toEqual({ metadata: undefined, imageUrl: undefined });
		});

		it('should handle nullish image URL', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				json: () => ({
					...mockMetadataResponse,
					image: undefined
				})
			} as unknown as Response);

			const result = await fetchMetadataFromUri(mockParams);

			expect(result).toEqual({
				metadata: {
					...mockMetadataResponse,
					image: undefined
				},
				imageUrl: undefined
			});
		});

		it('should handle different keys for image URL', async () => {
			const mockImageUrl = 'https://example.com/image.png';

			mockFetch.mockResolvedValue({
				ok: true,
				json: () => ({
					...mockMetadataResponse,
					image: undefined,
					image_url: mockImageUrl
				})
			} as unknown as Response);

			const result = await fetchMetadataFromUri(mockParams);

			expect(result).toEqual({
				metadata: {
					...mockMetadataResponse,
					image: undefined,
					image_url: mockImageUrl
				},
				imageUrl: new URL(mockImageUrl)
			});
		});

		it('should parse the URLs correctly', async () => {
			await fetchMetadataFromUri(mockParams);

			expect(parseMetadataResourceUrl).toHaveBeenCalledTimes(2);
			expect(parseMetadataResourceUrl).toHaveBeenNthCalledWith(1, {
				url: metadataUrl,
				error: new InvalidTokenUri(tokenId, contractAddress)
			});
			expect(parseMetadataResourceUrl).toHaveBeenNthCalledWith(2, {
				url: mockMetadataResponse.image,
				error: new InvalidMetadataImageUrl(tokenId, contractAddress)
			});
		});
	});
});
