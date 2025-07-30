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
				}
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
					attributes: [
						{ traitType: 'simple_property', value: 'example value' },
						{
							traitType: 'Name',
							value: '123 Example Value'
						},
						{
							traitType: 'Name',
							value: '1,2,3,4'
						}
					]
				});
			});

			it('should return undefined if the contract does not support ERC1155', async () => {
				mockSupportsInterface.mockResolvedValueOnce(false);

				const provider = new InfuraErc1155Provider(infura);

				const result = await provider.getNftMetadata(mockParams);

				expect(result).toBeUndefined();
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
