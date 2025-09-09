import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { AlchemyProvider, alchemyProviders } from '$eth/providers/alchemy.providers';
import type { AlchemyProviderContracts } from '$eth/types/alchemy-contract';
import type { EthereumNetwork } from '$eth/types/network';
import type { Nft, OwnedContract } from '$lib/types/nft';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mapTokenToCollection } from '$lib/utils/nfts.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockValidErc1155Token } from '$tests/mocks/erc1155-tokens.mock';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { Alchemy } from 'alchemy-sdk';

vi.mock(import('alchemy-sdk'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		Alchemy: vi.fn()
	};
});

vi.mock('$env/rest/alchemy.env', () => ({
	ALCHEMY_API_KEY: 'test-api-key'
}));

describe('alchemy.providers', () => {
	const ALCHEMY_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	it('should create the correct map of providers', () => {
		expect(Alchemy).toHaveBeenCalledTimes(networks.length);

		networks.forEach(({ providers: { alchemy } }, index) => {
			expect(Alchemy).toHaveBeenNthCalledWith(index + 1, {
				apiKey: ALCHEMY_API_KEY,
				network: alchemy
			});
		});
	});

	describe('getNftsByOwner', () => {
		const mockApiResponse = {
			ownedNfts: [
				{
					tokenId: '1',
					name: 'Name1',
					image: { originalUrl: 'https://download.com' },
					description: 'lorem ipsum',
					raw: { metadata: {} },
					balance: '1',
					contract: {}
				},
				{
					tokenId: '2',
					name: 'Name2',
					image: { originalUrl: 'https://download2.com' },
					description: 'lorem ipsum',
					raw: { metadata: {} },
					balance: '4',
					contract: {}
				}
			]
		};

		const expectedTokenIds: Nft[] = [
			{
				id: parseNftId(1),
				name: 'Name1',
				imageUrl: 'https://download.com',
				balance: 1,
				collection: {
					...mapTokenToCollection(mockValidErc1155Token)
				},
				description: 'lorem ipsum'
			},
			{
				id: parseNftId(2),
				name: 'Name2',
				imageUrl: 'https://download2.com',
				balance: 4,
				collection: {
					...mapTokenToCollection(mockValidErc1155Token)
				},
				description: 'lorem ipsum'
			}
		];

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should fetch and map token ids correctly', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getNftsForOwner: vi.fn().mockResolvedValue(mockApiResponse)
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const nfts = await provider.getNftsByOwner({
				address: mockEthAddress,
				token: mockValidErc1155Token
			});

			expect(Alchemy.prototype.nft.getNftsForOwner).toHaveBeenCalledOnce();
			expect(nfts).toStrictEqual(expectedTokenIds);
		});

		it('should only map existing data', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getNftsForOwner: vi.fn().mockResolvedValue({
						ownedNfts: [
							{
								tokenId: '1',
								raw: { metadata: {} },
								contract: {}
							},
							{
								tokenId: '2',
								raw: { metadata: {} },
								contract: {}
							}
						]
					})
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const nfts = await provider.getNftsByOwner({
				address: mockEthAddress,
				token: mockValidErc1155Token
			});

			expect(Alchemy.prototype.nft.getNftsForOwner).toHaveBeenCalledOnce();

			expect(nfts).toStrictEqual([
				{
					id: parseNftId(1),
					collection: {
						...mapTokenToCollection(mockValidErc1155Token)
					}
				},
				{
					id: parseNftId(2),
					collection: {
						...mapTokenToCollection(mockValidErc1155Token)
					}
				}
			]);
		});

		it('should throw an error', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getNftsForOwner: vi.fn().mockRejectedValueOnce(new Error('Nfts Error'))
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			await expect(
				provider.getNftsByOwner({ address: mockEthAddress, token: mockValidErc1155Token })
			).rejects.toThrow('Nfts Error');

			expect(Alchemy.prototype.nft.getNftsForOwner).toHaveBeenCalledOnce();
		});
	});

	describe('getTokensForOwner', () => {
		const mockApiResponse: AlchemyProviderContracts = {
			contracts: [
				{
					isSpam: false,
					address: mockEthAddress,
					tokenType: 'ERC721'
				},
				{
					isSpam: false,
					address: mockEthAddress2,
					tokenType: 'ERC721'
				}
			]
		};

		const expectedContracts: OwnedContract[] = [
			{ address: mockEthAddress, isSpam: false, standard: 'erc721' },
			{ address: mockEthAddress2, isSpam: false, standard: 'erc721' }
		];

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should fetch and map contracts correctly', async () => {
			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getContractsForOwner: vi.fn().mockResolvedValue(mockApiResponse)
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const contracts = await provider.getTokensForOwner(mockEthAddress);

			expect(Alchemy.prototype.nft.getContractsForOwner).toHaveBeenCalledOnce();

			expect(contracts).toStrictEqual(expectedContracts);
		});

		it('should handle incorrect token types correctly', async () => {
			const updatedMockApiResponse = {
				...mockApiResponse,
				...[
					{
						isSpam: false,
						address: mockEthAddress,
						tokenType: 'NO_SUPPORTED_NFT_STANDARD'
					}
				]
			};

			Object.defineProperty(Alchemy.prototype, 'nft', {
				value: {
					getContractsForOwner: vi.fn().mockResolvedValue(updatedMockApiResponse)
				},
				configurable: true
			});

			const provider = alchemyProviders(ETHEREUM_NETWORK.id);

			const contracts = await provider.getTokensForOwner(mockEthAddress);

			expect(Alchemy.prototype.nft.getContractsForOwner).toHaveBeenCalledOnce();

			expect(contracts).toStrictEqual(expectedContracts);
		});
	});

	describe('alchemyProviders', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = alchemyProviders(id);

				expect(provider).toBeInstanceOf(AlchemyProvider);

				expect(provider).toHaveProperty('provider');
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => alchemyProviders(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_alchemy_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
