import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { NftError } from '$lib/types/errors';
import type { Nft, NftsByNetwork } from '$lib/types/nft';
import { getNftsByNetworks, parseMetadataResourceUrl } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockValidNft } from '$tests/mocks/nfts.mock';

describe('nfts.utils', () => {
	const erc721Tokens: Erc721CustomToken[] = [
		{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, version: BigInt(1), enabled: true },
		{ ...DE_GODS_TOKEN, version: BigInt(1), enabled: true }
	];

	const mockNft1: Nft = {
		...mockValidNft,
		contract: {
			...mockValidNft.contract,
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const mockNft2: Nft = {
		...mockValidNft,
		id: parseNftId(12632),
		contract: {
			...mockValidNft.contract,
			address: AZUKI_ELEMENTAL_BEANS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	const mockNft3: Nft = {
		...mockValidNft,
		id: parseNftId(843764),
		contract: {
			...mockValidNft.contract,
			address: DE_GODS_TOKEN.address,
			network: POLYGON_AMOY_NETWORK
		}
	};

	describe('getNftsByNetworks', () => {
		it('should return nfts for a given list of tokens and networks', () => {
			const customErc721Tokens: Erc721CustomToken[] = [
				{
					...AZUKI_ELEMENTAL_BEANS_TOKEN,
					version: BigInt(1),
					enabled: true,
					network: ETHEREUM_NETWORK
				},
				{ ...DE_GODS_TOKEN, version: BigInt(1), enabled: true }
			];

			const customMockNft1: Nft = {
				...mockNft1,
				contract: { ...mockNft1.contract, network: ETHEREUM_NETWORK }
			};

			const customMockNft2: Nft = {
				...mockNft2,
				contract: { ...mockNft2.contract, network: ETHEREUM_NETWORK }
			};

			const result: NftsByNetwork = getNftsByNetworks({
				tokens: customErc721Tokens,
				nfts: [customMockNft1, customMockNft2, mockNft3]
			});

			const expectedResult: NftsByNetwork = {
				[ETHEREUM_NETWORK.id]: {
					[AZUKI_ELEMENTAL_BEANS_TOKEN.address.toLowerCase()]: [customMockNft1, customMockNft2]
				},
				[POLYGON_AMOY_NETWORK.id]: {
					[DE_GODS_TOKEN.address.toLowerCase()]: [mockNft3]
				}
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return nfts for a given list of tokens', () => {
			const result: NftsByNetwork = getNftsByNetworks({
				tokens: erc721Tokens,
				nfts: [mockNft1, mockNft2, mockNft3]
			});

			const expectedResult: NftsByNetwork = {
				[POLYGON_AMOY_NETWORK.id]: {
					[AZUKI_ELEMENTAL_BEANS_TOKEN.address.toLowerCase()]: [mockNft1, mockNft2],
					[DE_GODS_TOKEN.address.toLowerCase()]: [mockNft3]
				}
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return empty lists for tokens that do not have matching nfts', () => {
			const customMockNft1: Nft = {
				...mockNft1,
				contract: { ...mockNft1.contract, address: mockEthAddress }
			};
			const customMockNft2: Nft = {
				...mockNft2,
				contract: { ...mockNft2.contract, address: mockEthAddress }
			};
			const customMockNft3: Nft = {
				...mockNft3,
				contract: { ...mockNft3.contract, address: mockEthAddress }
			};

			const result: NftsByNetwork = getNftsByNetworks({
				tokens: erc721Tokens,
				nfts: [customMockNft1, customMockNft2, customMockNft3]
			});

			const expectedResult: NftsByNetwork = {
				[POLYGON_AMOY_NETWORK.id]: {
					[AZUKI_ELEMENTAL_BEANS_TOKEN.address.toLowerCase()]: [],
					[DE_GODS_TOKEN.address.toLowerCase()]: []
				}
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return an empty map', () => {
			const result: NftsByNetwork = getNftsByNetworks({
				tokens: [],
				nfts: [mockNft1, mockNft2, mockNft3]
			});

			const expectedResult = {};

			expect(result).toEqual(expectedResult);
		});

		it('should return empty lists for tokens for which no nfts were provided', () => {
			const result = getNftsByNetworks({ tokens: erc721Tokens, nfts: [] });

			const expectedResult: NftsByNetwork = {
				[POLYGON_AMOY_NETWORK.id]: {
					[AZUKI_ELEMENTAL_BEANS_TOKEN.address.toLowerCase()]: [],
					[DE_GODS_TOKEN.address.toLowerCase()]: []
				}
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return an empty map if no tokens and no nfts are provided', () => {
			const result = getNftsByNetworks({ tokens: [], nfts: [] });

			const expectedResult = {};

			expect(result).toEqual(expectedResult);
		});
	});

	describe('parseMetadataResourceUrl', () => {
		const mockError = new NftError(123456, PEPE_TOKEN.address);

		it('should raise an error if URL is not a parseable URL', () => {
			const url = 'invalid-url';

			expect(() => parseMetadataResourceUrl({ url, error: mockError })).toThrow(mockError);
		});

		it('should return the same URL if not IPFS protocol', () => {
			const url = 'https://example.com/metadata.json';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result).toBeInstanceOf(URL);
			expect(result?.href).toBe(url);
		});

		it('should transform a valid ipfs:// URL to ipfs.io', () => {
			const url = 'ipfs://Qm12345abcde/metadata.json';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result).toBeInstanceOf(URL);
			expect(result?.href).toBe('https://ipfs.io/ipfs/Qm12345abcde/metadata.json');
		});

		it('should handle malformed IPFS path', () => {
			const url = 'ipfs://';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result?.href).toBe('https://ipfs.io/ipfs/');
		});

		it('should handle transformed IPFS URL with emojis', () => {
			const url = 'ipfs://??//💣';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result?.href).toBe('https://ipfs.io/ipfs/??//%F0%9F%92%A3');
		});

		it('should handle IPFS URL that is not valid per UrlSchema', () => {
			const url = 'ipfs:??//💣';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result?.href).toBe('ipfs:??//%F0%9F%92%A3');
		});

		it('should handle empty IPFS string', () => {
			const url = 'ipfs:// ';
			const result = parseMetadataResourceUrl({ url, error: mockError });

			expect(result?.href).toBe('ipfs:/');
		});

		it('should not allow URL with localhost', () => {
			const url = 'http://localhost:3000/some-data';

			expect(() => parseMetadataResourceUrl({ url, error: mockError })).toThrow(mockError);
		});
	});
});
