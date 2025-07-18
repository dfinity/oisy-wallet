import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { Nft } from '$lib/types/nft';
import { getLoadedNftsByTokens, type NftsByNetwork } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockValidNft } from '$tests/mocks/nfts.mock';
import { POLYGON_AMOY_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';

describe('nfts.utils', () => {
	const erc721Tokens: Erc721CustomToken[] = [
		{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, version: BigInt(1), enabled: true },
		{ ...DE_GODS_TOKEN, version: BigInt(1), enabled: true }
	];

	const mockNft1: Nft = {
		...mockValidNft,
		contract: { ...mockValidNft.contract, address: AZUKI_ELEMENTAL_BEANS_TOKEN.address, network: POLYGON_AMOY_NETWORK }
	};

	const mockNft2: Nft = {
		...mockValidNft,
		id: parseNftId(12632),
		contract: { ...mockValidNft.contract, address: AZUKI_ELEMENTAL_BEANS_TOKEN.address, network: POLYGON_AMOY_NETWORK }
	};

	const mockNft3: Nft = {
		...mockValidNft,
		id: parseNftId(843764),
		contract: { ...mockValidNft.contract, address: DE_GODS_TOKEN.address, network: POLYGON_AMOY_NETWORK }
	};

	describe('getLoadedNftsByTokens', () => {
		it('should return nfts for a given list of tokens and networks', () => {
			const customErc721Tokens: Erc721CustomToken[] = [
				{ ...AZUKI_ELEMENTAL_BEANS_TOKEN, version: BigInt(1), enabled: true, network: ETHEREUM_NETWORK },
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

			const result: NftsByNetwork = getLoadedNftsByTokens({
				tokens: customErc721Tokens,
				loadedNfts: [customMockNft1, customMockNft2, mockNft3]
			});

			const expectedResult: NftsByNetwork = {
				[ETHEREUM_NETWORK.id]: {
					[AZUKI_ELEMENTAL_BEANS_TOKEN.address.toLowerCase()]: [customMockNft1, customMockNft2],
				},
				[POLYGON_AMOY_NETWORK.id]: {
					[DE_GODS_TOKEN.address.toLowerCase()]: [mockNft3]
				}
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return nfts for a given list of tokens', () => {
			const result: NftsByNetwork = getLoadedNftsByTokens({
				tokens: erc721Tokens,
				loadedNfts: [mockNft1, mockNft2, mockNft3]
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

			const result: NftsByNetwork = getLoadedNftsByTokens({
				tokens: erc721Tokens,
				loadedNfts: [customMockNft1, customMockNft2, customMockNft3]
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
			const result: NftsByNetwork = getLoadedNftsByTokens({
				tokens: [],
				loadedNfts: [mockNft1, mockNft2, mockNft3]
			});

			const expectedResult = {};

			expect(result).toEqual(expectedResult);
		});

		it('should return empty lists for tokens for which no nfts were provided', () => {
			const result = getLoadedNftsByTokens({ tokens: erc721Tokens, loadedNfts: [] });

			const expectedResult: NftsByNetwork = {
				[POLYGON_AMOY_NETWORK.id]: {
					[AZUKI_ELEMENTAL_BEANS_TOKEN.address.toLowerCase()]: [],
					[DE_GODS_TOKEN.address.toLowerCase()]: []
				}
			};

			expect(result).toEqual(expectedResult);
		});

		it('should return an empty map if no tokens and no nfts are provided', () => {
			const result = getLoadedNftsByTokens({ tokens: [], loadedNfts: [] });

			const expectedResult = { };

			expect(result).toEqual(expectedResult);
		});
	});
});