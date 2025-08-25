import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { Erc165Identifier } from '$eth/constants/erc.constants';
import { ERC1155_ABI } from '$eth/constants/erc1155.constants';
import { ERC165_ABI } from '$eth/constants/erc165.constants';
import {
	InfuraErc1155Provider,
	infuraErc1155Providers
} from '$eth/providers/infura-erc1155.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseNftId } from '$lib/validation/nft.validation';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { Contract } from 'ethers/contract';
import { InfuraProvider as InfuraProviderLib } from 'ethers/providers';

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

vi.mock('ethers/contract', () => ({
	Contract: vi.fn()
}));

describe('infura-erc1155.providers', () => {
	const INFURA_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	describe('InfuraErc1155Provider', () => {
		const {
			providers: { infura }
		} = ETHEREUM_NETWORK;
		const { address: contractAddress } = PEPE_TOKEN;

		const mockProvider = vi.mocked(InfuraProviderLib);
		const expectedContractParams = [contractAddress, ERC1155_ABI];

		const mockContract = vi.mocked(Contract);

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should initialise the provider with the correct network and API key', () => {
			const provider = new InfuraErc1155Provider(infura);

			expect(provider).toBeDefined();
			expect(InfuraProviderLib).toHaveBeenCalledWith(infura, INFURA_API_KEY);
		});

		describe('getNftMetadata', () => {
			const mockSupportsInterface = vi.fn();
			const mockUri = vi.fn();

			const tokenId = parseNftId(12345);

			const mockParams = {
				contractAddress,
				tokenId
			};

			const mockMetadataUrl = 'https://arweave.net/1nuy5HbqLrIgBsfuI5Bmq3t1fQXt2wz-obYJkBkQA_o';

			const mockMetadata = {
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
				},
				attributes: [
					{ trait_type: 'Issuance Month', value: '2022/06' },
					{ trait_type: 'Pepe', value: 'No' },
					{ trait_type: 'GM', value: 'No' },
					{
						display_type: 'boost_percentage',
						trait_type: 'Points - Power',
						value: '69',
						max_value: '100'
					},
					{
						display_type: 'boost_percentage',
						trait_type: 'Points - Wisdom',
						value: '100',
						max_value: '100'
					},
					{
						display_type: 'boost_percentage',
						trait_type: 'Points - Loki',
						value: '0',
						max_value: '100'
					},
					{
						display_type: 'boost_percentage',
						trait_type: 'Points - Speed',
						value: '25',
						max_value: '100'
					},
					{ trait_type: 'Bonus', value: 'None' },
					{ trait_type: 'Boost', value: 'None' },
					{ display_type: 'number', trait_type: 'Type - Meme', value: '1' },
					{ display_type: 'number', trait_type: 'Type - Season', value: '1' },
					{ display_type: 'number', trait_type: 'Type - Card', value: '1' },
					{ trait_type: 'Summer', value: 'No' },
					{ trait_type: 'Tulip', value: 'No' },
					{ value: '6529er', trait_type: 'SEIZE Artist Profile' }
				]
			};

			beforeEach(() => {
				vi.clearAllMocks();

				global.fetch = vi.fn().mockResolvedValue({
					json: () => Promise.resolve(mockMetadata)
				});

				mockSupportsInterface.mockResolvedValue(true);
				mockUri.mockResolvedValue(mockMetadataUrl);

				mockContract.prototype.supportsInterface =
					mockSupportsInterface as unknown as typeof mockContract.prototype.supportsInterface;
				mockContract.prototype.uri = mockUri as unknown as typeof mockContract.prototype.uri;
			});

			it('should return the NFT metadata of the token ID', async () => {
				const provider = new InfuraErc1155Provider(infura);

				const result = await provider.getNftMetadata(mockParams);

				expect(result).toEqual({
					id: tokenId,
					name: mockMetadata.name,
					imageUrl: mockMetadata.image,
					description: mockMetadata.description,
					attributes: [
						{ traitType: 'Issuance Month', value: '2022/06' },
						{ traitType: 'Pepe', value: 'No' },
						{ traitType: 'GM', value: 'No' },
						{ traitType: 'Points - Power', value: '69' },
						{ traitType: 'Points - Wisdom', value: '100' },
						{ traitType: 'Points - Loki', value: '0' },
						{ traitType: 'Points - Speed', value: '25' },
						{ traitType: 'Bonus', value: 'None' },
						{ traitType: 'Boost', value: 'None' },
						{ traitType: 'Type - Meme', value: '1' },
						{ traitType: 'Type - Season', value: '1' },
						{ traitType: 'Type - Card', value: '1' },
						{ traitType: 'Summer', value: 'No' },
						{ traitType: 'Tulip', value: 'No' },
						{ traitType: 'SEIZE Artist Profile', value: '6529er' },
						{ traitType: 'simple_property', value: 'example value' },
						{ traitType: 'Name', value: '123 Example Value' },
						{ traitType: 'Name', value: '1,2,3,4' }
					]
				});
			});

			it('should handle metadata gracefully if the contract does not support IERC1155MetadataURI', async () => {
				mockSupportsInterface.mockResolvedValueOnce(false);

				const provider = new InfuraErc1155Provider(infura);

				const result = await provider.getNftMetadata(mockParams);

				expect(result).toEqual({ id: tokenId });
			});

			it('should call the uri method of the contract', async () => {
				const provider = new InfuraErc1155Provider(infura);

				await provider.getNftMetadata(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledTimes(2);
				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					contractAddress,
					ERC165_ABI,
					new mockProvider()
				);
				expect(mockContract).toHaveBeenNthCalledWith(
					2,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockSupportsInterface).toHaveBeenCalledExactlyOnceWith(
					Erc165Identifier.ERC1155_METADATA_URI
				);

				expect(mockUri).toHaveBeenCalledExactlyOnceWith(tokenId);
			});

			it('should handle errors gracefully', async () => {
				const errorMessage = 'Error fetching URI';
				mockUri.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc1155Provider(infura);

				await expect(provider.getNftMetadata(mockParams)).rejects.toThrow(errorMessage);
			});

			it('should handle nullish metadata gracefully', async () => {
				global.fetch = vi.fn().mockResolvedValueOnce({
					json: () => Promise.resolve(undefined)
				});

				const provider = new InfuraErc1155Provider(infura);

				const result = await provider.getNftMetadata(mockParams);

				expect(result).toEqual({ id: tokenId });
			});
		});

		describe('balanceOf', () => {
			const mockBalanceOf = vi.fn();

			const tokenId = parseNftId(12345);

			const mockParams = {
				contractAddress,
				walletAddress: mockEthAddress,
				tokenId
			};

			const mockBalance = 2;

			beforeEach(() => {
				vi.clearAllMocks();

				mockBalanceOf.mockResolvedValue(mockBalance);

				mockContract.prototype.balanceOf =
					mockBalanceOf as unknown as typeof mockContract.prototype.balanceOf;
			});

			it('should return the balance of the token ID for a specific wallet', async () => {
				const provider = new InfuraErc1155Provider(infura);

				const result = await provider.balanceOf(mockParams);

				expect(mockBalanceOf).toHaveBeenCalledExactlyOnceWith(mockEthAddress, tokenId);

				expect(result).toEqual(mockBalance);
			});

			it('should throw an error', async () => {
				const errorMessage = 'Error loading balance';
				mockBalanceOf.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc1155Provider(infura);

				await expect(provider.balanceOf(mockParams)).rejects.toThrow(errorMessage);
			});
		});

		describe('infuraErc1155Providers', () => {
			networks.forEach(({ id, name }) => {
				it(`should return the correct provider for ${name} network`, () => {
					const provider = infuraErc1155Providers(id);

					expect(provider).toBeInstanceOf(InfuraErc1155Provider);

					expect(provider).toHaveProperty('network');
				});
			});

			it('should throw an error for an unsupported network ID', () => {
				expect(() => infuraErc1155Providers(ICP_NETWORK_ID)).toThrow(
					replacePlaceholders(en.init.error.no_infura_erc1155_provider, {
						$network: ICP_NETWORK_ID.toString()
					})
				);
			});
		});
	});
});
