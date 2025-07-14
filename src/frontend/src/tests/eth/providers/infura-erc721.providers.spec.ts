import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { ERC721_ABI } from '$eth/constants/erc721.constants';
import {
	InfuraErc721Provider,
	infuraErc721Providers
} from '$eth/providers/infura-erc721.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { Contract } from 'ethers/contract';
import { InfuraProvider as InfuraProviderLib } from 'ethers/providers';
import { describe, type MockedClass } from 'vitest';

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

vi.mock('ethers/contract', () => ({
	Contract: vi.fn()
}));

describe('infura-erc721.providers', () => {
	const INFURA_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	describe('InfuraErc721Provider', () => {
		const {
			providers: { infura }
		} = ETHEREUM_NETWORK;
		const { address: contractAddress } = PEPE_TOKEN;

		const mockProvider = InfuraProviderLib as MockedClass<typeof InfuraProviderLib>;
		const expectedContractParams = [contractAddress, ERC721_ABI];

		const mockContract = Contract as MockedClass<typeof Contract>;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should initialise the provider with the correct network and API key', () => {
			const provider = new InfuraErc721Provider(infura);

			expect(provider).toBeDefined();
			expect(InfuraProviderLib).toHaveBeenCalledWith(infura, INFURA_API_KEY);
		});

		describe('metadata method', () => {
			const mockName = vi.fn() as unknown as typeof mockContract.prototype.name;
			const mockSymbol = vi.fn() as unknown as typeof mockContract.prototype.symbol;

			const mockParams = {
				address: contractAddress
			};

			beforeEach(() => {
				vi.clearAllMocks();

				mockName.mockResolvedValue('mock-name');
				mockSymbol.mockResolvedValue('mock-symbol');

				mockContract.prototype.name = mockName;
				mockContract.prototype.symbol = mockSymbol;
			});

			it('should return the fetched metadata', async () => {
				const provider = new InfuraErc721Provider(infura);

				const result = await provider.metadata(mockParams);

				expect(result).toStrictEqual({
					name: 'mock-name',
					symbol: 'mock-symbol',
					decimals: 0
				});
			});

			it('should call the metadata methods of the contract', async () => {
				const provider = new InfuraErc721Provider(infura);

				await provider.metadata(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledOnce();

				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockName).toHaveBeenCalledOnce();
				expect(mockSymbol).toHaveBeenCalledOnce();
			});

			it('should handle errors gracefully', async () => {
				const errorMessage = 'Error fetching metadata';
				mockName.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc721Provider(infura);

				await expect(provider.metadata(mockParams)).rejects.toThrow(errorMessage);
			});
		});

		describe('isErc721 method', () => {
			const mockSupportsInterface =
				vi.fn() as unknown as typeof mockContract.prototype.supportsInterface;

			const mockParams = {
				contractAddress
			};

			beforeEach(() => {
				vi.clearAllMocks();

				mockSupportsInterface.mockResolvedValue(true);

				mockContract.prototype.supportsInterface = mockSupportsInterface;
			});

			it('should return true if contract is erc721', async () => {
				const provider = new InfuraErc721Provider(infura);

				const result = await provider.isErc721(mockParams);

				expect(result).toBeTruthy();
			});

			it('should call the supportsInterface method of the contract', async () => {
				const provider = new InfuraErc721Provider(infura);

				await provider.isErc721(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledOnce();

				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockSupportsInterface).toHaveBeenCalledOnce();
			});
		});

		describe('infuraErc721Providers', () => {
			networks.forEach(({ id, name }) => {
				it(`should return the correct provider for ${name} network`, () => {
					const provider = infuraErc721Providers(id);

					expect(provider).toBeInstanceOf(InfuraErc721Provider);

					expect(provider).toHaveProperty('network');
				});
			});

			it('should throw an error for an unsupported network ID', () => {
				expect(() => infuraErc721Providers(ICP_NETWORK_ID)).toThrow(
					replacePlaceholders(en.init.error.no_infura_erc721_provider, {
						$network: ICP_NETWORK_ID.toString()
					})
				);
			});
		});
	});
});
