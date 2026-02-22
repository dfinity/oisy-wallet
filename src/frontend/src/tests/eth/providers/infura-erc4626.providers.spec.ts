import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { ERC4626_ABI } from '$eth/constants/erc4626.constants';
import {
	InfuraErc4626Provider,
	infuraErc4626Providers
} from '$eth/providers/infura-erc4626.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { Contract } from 'ethers/contract';
import { InfuraProvider as InfuraProviderLib } from 'ethers/providers';

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

vi.mock('ethers/contract', () => ({
	Contract: vi.fn()
}));

describe('infura-erc4626.providers', () => {
	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	describe('InfuraErc4626Provider', () => {
		const {
			providers: { infura }
		} = ETHEREUM_NETWORK;
		const contractAddress = '0x0d877dc7c8fa3ad980dfdb18b48ec9f8768359c4';

		const mockProvider = vi.mocked(InfuraProviderLib);
		const expectedContractParams = [contractAddress, ERC4626_ABI];

		const mockContract = vi.mocked(Contract);

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should initialise the provider with the correct network and API key', () => {
			const provider = new InfuraErc4626Provider(infura);

			expect(provider).toBeDefined();
			expect(InfuraProviderLib).toHaveBeenCalledWith(infura, 'test-api-key');
		});

		it('should be an instance of InfuraErc20Provider', () => {
			const provider = new InfuraErc4626Provider(infura);

			expect(provider).toBeInstanceOf(InfuraErc4626Provider);
		});

		describe('isInterfaceErc4626', () => {
			const mockAsset = vi.fn();
			const mockTotalAssets = vi.fn();

			beforeEach(() => {
				vi.clearAllMocks();

				mockAsset.mockResolvedValue('0xmockAssetAddress');
				mockTotalAssets.mockResolvedValue(1000000n);

				mockContract.prototype.asset = mockAsset as unknown as typeof mockContract.prototype.asset;
				mockContract.prototype.totalAssets =
					mockTotalAssets as unknown as typeof mockContract.prototype.totalAssets;
			});

			it('should return true when contract implements ERC4626', async () => {
				const provider = new InfuraErc4626Provider(infura);

				const result = await provider.isInterfaceErc4626(contractAddress);

				expect(result).toBeTruthy();
			});

			it('should return false when asset() returns nullish', async () => {
				mockAsset.mockResolvedValue(null);

				const provider = new InfuraErc4626Provider(infura);

				const result = await provider.isInterfaceErc4626(contractAddress);

				expect(result).toBeFalsy();
			});

			it('should return false when totalAssets() returns nullish', async () => {
				mockTotalAssets.mockResolvedValue(null);

				const provider = new InfuraErc4626Provider(infura);

				const result = await provider.isInterfaceErc4626(contractAddress);

				expect(result).toBeFalsy();
			});

			it('should return false when contract call throws', async () => {
				mockAsset.mockRejectedValue(new Error('Not ERC4626'));

				const provider = new InfuraErc4626Provider(infura);

				const result = await provider.isInterfaceErc4626(contractAddress);

				expect(result).toBeFalsy();
			});

			it('should create contract with ERC4626 ABI', async () => {
				const provider = new InfuraErc4626Provider(infura);

				await provider.isInterfaceErc4626(contractAddress);

				expect(mockContract).toHaveBeenCalledOnce();
				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);
			});
		});

		describe('getAssetAddress', () => {
			const mockAsset = vi.fn();
			const mockAssetAddress = 'mockAssetAddress';

			beforeEach(() => {
				vi.clearAllMocks();

				mockAsset.mockResolvedValue(mockAssetAddress);

				mockContract.prototype.asset = mockAsset as unknown as typeof mockContract.prototype.asset;
			});

			it('should return the asset address', async () => {
				const provider = new InfuraErc4626Provider(infura);

				const result = await provider.getAssetAddress(contractAddress);

				expect(result).toBe(mockAssetAddress);
			});

			it('should call the asset method of the contract', async () => {
				const provider = new InfuraErc4626Provider(infura);

				await provider.getAssetAddress(contractAddress);

				expect(mockContract).toHaveBeenCalledOnce();
				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockAsset).toHaveBeenCalledOnce();
			});

			it('should handle errors gracefully', async () => {
				const errorMessage = 'Error fetching asset address';
				mockAsset.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc4626Provider(infura);

				await expect(provider.getAssetAddress(contractAddress)).rejects.toThrowError(errorMessage);
			});
		});

		describe('convertToAssets', () => {
			const mockConvertToAssets = vi.fn();
			const mockShares = 10n ** 8n;
			const mockAssetsResult = 1050000n;

			beforeEach(() => {
				vi.clearAllMocks();

				mockConvertToAssets.mockResolvedValue(mockAssetsResult);

				mockContract.prototype.convertToAssets =
					mockConvertToAssets as unknown as typeof mockContract.prototype.convertToAssets;
			});

			it('should return the converted assets amount', async () => {
				const provider = new InfuraErc4626Provider(infura);

				const result = await provider.convertToAssets({
					contract: contractAddress,
					shares: mockShares
				});

				expect(result).toBe(mockAssetsResult);
			});

			it('should call convertToAssets on the contract with the correct shares', async () => {
				const provider = new InfuraErc4626Provider(infura);

				await provider.convertToAssets({ contract: contractAddress, shares: mockShares });

				expect(mockContract).toHaveBeenCalledOnce();
				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockConvertToAssets).toHaveBeenCalledOnce();
				expect(mockConvertToAssets).toHaveBeenNthCalledWith(1, mockShares);
			});

			it('should handle errors gracefully', async () => {
				const errorMessage = 'Error converting to assets';
				mockConvertToAssets.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc4626Provider(infura);

				await expect(
					provider.convertToAssets({ contract: contractAddress, shares: mockShares })
				).rejects.toThrowError(errorMessage);
			});
		});
	});

	describe('infuraErc4626Providers', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = infuraErc4626Providers(id);

				expect(provider).toBeInstanceOf(InfuraErc4626Provider);
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => infuraErc4626Providers(ICP_NETWORK_ID)).toThrowError(
				replacePlaceholders(en.init.error.no_infura_erc4626_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
