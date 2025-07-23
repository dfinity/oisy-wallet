import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { ERC20_ABI } from '$eth/constants/erc20.constants';
import { InfuraErc20Provider, infuraErc20Providers } from '$eth/providers/infura-erc20.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { ZERO } from '$lib/constants/app.constants';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { Contract, type ContractTransaction } from 'ethers/contract';
import { InfuraProvider as InfuraProviderLib } from 'ethers/providers';

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

vi.mock('ethers/contract', () => ({
	Contract: vi.fn()
}));

describe('infura-erc20.providers', () => {
	const INFURA_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	it('should create the correct map of providers', () => {
		expect(InfuraProviderLib).toHaveBeenCalledTimes(networks.length);

		networks.forEach(({ providers: { infura } }, index) => {
			expect(InfuraProviderLib).toHaveBeenNthCalledWith(index + 1, infura, INFURA_API_KEY);
		});
	});

	describe('InfuraErc20Provider', () => {
		const {
			providers: { infura }
		} = ETHEREUM_NETWORK;
		const { address: contractAddress } = PEPE_TOKEN;

		const mockProvider = vi.mocked(InfuraProviderLib);
		const expectedContractParams = [contractAddress, ERC20_ABI];

		const mockContract = vi.mocked(Contract);

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should initialise the provider with the correct network and API key', () => {
			const provider = new InfuraErc20Provider(infura);

			expect(provider).toBeDefined();
			expect(InfuraProviderLib).toHaveBeenCalledWith(infura, INFURA_API_KEY);
		});

		describe('metadata method', () => {
			const mockName = vi.fn();
			const mockSymbol = vi.fn();
			const mockDecimals = vi.fn();

			const mockParams = {
				address: contractAddress
			};

			beforeEach(() => {
				vi.clearAllMocks();

				mockName.mockResolvedValue('mock-name');
				mockSymbol.mockResolvedValue('mock-symbol');
				mockDecimals.mockResolvedValue('18');

				mockContract.prototype.name = mockName as unknown as typeof mockContract.prototype.name;
				mockContract.prototype.symbol =
					mockSymbol as unknown as typeof mockContract.prototype.symbol;
				mockContract.prototype.decimals =
					mockDecimals as unknown as typeof mockContract.prototype.decimals;
			});

			it('should return the fetched metadata', async () => {
				const provider = new InfuraErc20Provider(infura);

				const result = await provider.metadata(mockParams);

				expect(result).toStrictEqual({
					name: 'mock-name',
					symbol: 'mock-symbol',
					decimals: 18
				});
			});

			it('should call the metadata methods of the contract', async () => {
				const provider = new InfuraErc20Provider(infura);

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
				expect(mockDecimals).toHaveBeenCalledOnce();
			});

			it('should handle errors gracefully', async () => {
				const errorMessage = 'Error fetching metadata';
				mockName.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc20Provider(infura);

				await expect(provider.metadata(mockParams)).rejects.toThrow(errorMessage);
			});
		});

		describe('balance method', () => {
			const mockBalanceOf = vi.fn();

			const mockParams = {
				contract: { address: contractAddress },
				address: mockEthAddress
			};

			beforeEach(() => {
				vi.clearAllMocks();

				mockBalanceOf.mockResolvedValue(123456n);

				mockContract.prototype.balanceOf =
					mockBalanceOf as unknown as typeof mockContract.prototype.balanceOf;
			});

			it('should return the fetched balance', async () => {
				const provider = new InfuraErc20Provider(infura);

				const result = await provider.balance(mockParams);

				expect(result).toBe(123456n);
			});

			it('should call the balance method of the contract', async () => {
				const provider = new InfuraErc20Provider(infura);

				await provider.balance(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledOnce();
				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockBalanceOf).toHaveBeenCalledOnce();
			});

			it('should handle errors gracefully', async () => {
				const errorMessage = 'Error fetching balance';
				mockBalanceOf.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc20Provider(infura);

				await expect(provider.balance(mockParams)).rejects.toThrow(errorMessage);
			});
		});

		describe('getFeeData method', () => {
			const mockApproveEstimateGas = vi.fn();
			const mockTransferEstimateGas = vi.fn();
			const mockApprove = vi.fn() as unknown as typeof mockContract.prototype.approve;
			const mockTransfer = vi.fn() as unknown as typeof mockContract.prototype.transfer;

			const mockApproveGas = 100n;
			const mockTransferGas = 200n;

			const mockAmount = 123456n;

			const mockParams = {
				contract: { address: contractAddress },
				to: mockEthAddress,
				from: mockEthAddress2,
				amount: mockAmount
			};

			beforeEach(() => {
				vi.clearAllMocks();

				mockApproveEstimateGas.mockResolvedValue(mockApproveGas);
				mockTransferEstimateGas.mockResolvedValue(mockTransferGas);

				mockApprove.estimateGas = mockApproveEstimateGas;
				mockTransfer.estimateGas = mockTransferEstimateGas;

				mockContract.prototype.approve = mockApprove;
				mockContract.prototype.transfer = mockTransfer;
			});

			it('should return the highest estimated fee', async () => {
				const provider = new InfuraErc20Provider(infura);

				const result = await provider.getFeeData(mockParams);

				expect(result).toStrictEqual(mockTransferGas);
			});

			it('should call the approve method of the contract', async () => {
				const provider = new InfuraErc20Provider(infura);

				await provider.getFeeData(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledOnce();
				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockApprove.estimateGas).toHaveBeenCalledOnce();
				expect(mockApprove.estimateGas).toHaveBeenNthCalledWith(1, mockEthAddress, mockAmount, {
					from: mockEthAddress2
				});
			});

			it('should call the transfer method of the contract', async () => {
				const provider = new InfuraErc20Provider(infura);

				await provider.getFeeData(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledOnce();
				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockTransfer.estimateGas).toHaveBeenCalledOnce();
				expect(mockTransfer.estimateGas).toHaveBeenNthCalledWith(1, mockEthAddress, mockAmount, {
					from: mockEthAddress2
				});
			});

			it('should ignore errors raised by the approve method', async () => {
				const errorMessage = 'Error fetching approve fee data';
				mockApproveEstimateGas.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc20Provider(infura);

				const result = await provider.getFeeData(mockParams);

				expect(result).toStrictEqual(mockTransferGas);
			});

			it('should ignore errors raised by the transfer method', async () => {
				const errorMessage = 'Error fetching transfer fee data';
				mockTransferEstimateGas.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc20Provider(infura);

				const result = await provider.getFeeData(mockParams);

				expect(result).toStrictEqual(mockApproveGas);
			});

			it('should handle all errors gracefully', async () => {
				const errorMessage = 'Error fetching fee data';
				mockApproveEstimateGas.mockRejectedValue(new Error(errorMessage));
				mockTransferEstimateGas.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc20Provider(infura);

				const result = await provider.getFeeData(mockParams);

				expect(result).toStrictEqual(ZERO);
			});
		});

		describe('populateTransaction method', () => {
			const mockPopulateTransaction = vi.fn();
			const mockTransfer = vi.fn() as unknown as typeof mockContract.prototype.transfer;

			const mockContractTransaction: ContractTransaction = {
				to: mockEthAddress,
				data: '0x',
				from: mockEthAddress2
			};

			const mockAmount = 123456n;

			const mockParams = {
				contract: { address: contractAddress },
				to: mockEthAddress,
				amount: mockAmount
			};

			beforeEach(() => {
				vi.clearAllMocks();

				mockPopulateTransaction.mockResolvedValue(mockContractTransaction);

				mockTransfer.populateTransaction = mockPopulateTransaction;

				mockContract.prototype.transfer = mockTransfer;
			});

			it('should return a populated transfer transaction', async () => {
				const provider = new InfuraErc20Provider(infura);

				const result = await provider.populateTransaction(mockParams);

				expect(result).toStrictEqual(mockContractTransaction);
			});

			it('should call the transfer method of the contract', async () => {
				const provider = new InfuraErc20Provider(infura);

				await provider.populateTransaction(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledOnce();
				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockTransfer.populateTransaction).toHaveBeenCalledOnce();
				expect(mockTransfer.populateTransaction).toHaveBeenNthCalledWith(
					1,
					mockEthAddress,
					mockAmount
				);
			});

			it('should handle errors gracefully', async () => {
				const errorMessage = 'Error populating transfer transaction';
				mockPopulateTransaction.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc20Provider(infura);

				await expect(provider.populateTransaction(mockParams)).rejects.toThrow(errorMessage);
			});
		});

		describe('populateApprove method', () => {
			const mockPopulateTransaction = vi.fn();
			const mockApprove = vi.fn() as unknown as typeof mockContract.prototype.approve;

			const mockContractTransaction: ContractTransaction = {
				to: mockEthAddress,
				data: '0x',
				from: mockEthAddress2
			};

			const mockAmount = 123456n;

			const mockParams = {
				contract: { address: contractAddress },
				spender: mockEthAddress2,
				amount: mockAmount
			};

			beforeEach(() => {
				vi.clearAllMocks();

				mockPopulateTransaction.mockResolvedValue(mockContractTransaction);

				mockApprove.populateTransaction = mockPopulateTransaction;

				mockContract.prototype.approve = mockApprove;
			});

			it('should return a populated approve transaction', async () => {
				const provider = new InfuraErc20Provider(infura);

				const result = await provider.populateApprove(mockParams);

				expect(result).toStrictEqual(mockContractTransaction);
			});

			it('should call the approve method of the contract', async () => {
				const provider = new InfuraErc20Provider(infura);

				await provider.populateApprove(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledOnce();
				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockApprove.populateTransaction).toHaveBeenCalledOnce();
				expect(mockApprove.populateTransaction).toHaveBeenNthCalledWith(
					1,
					mockEthAddress2,
					mockAmount
				);
			});

			it('should handle errors gracefully', async () => {
				const errorMessage = 'Error populating approve transaction';
				mockPopulateTransaction.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc20Provider(infura);

				await expect(provider.populateApprove(mockParams)).rejects.toThrow(errorMessage);
			});
		});

		describe('allowance method', () => {
			const mockAllowance = vi.fn();

			const mockParams = {
				contract: { address: contractAddress },
				owner: mockEthAddress,
				spender: mockEthAddress2
			};

			beforeEach(() => {
				vi.clearAllMocks();

				mockAllowance.mockResolvedValue(123456n);

				mockContract.prototype.allowance =
					mockAllowance as unknown as typeof mockContract.prototype.allowance;
			});

			it('should return the fetched allowance', async () => {
				const provider = new InfuraErc20Provider(infura);

				const result = await provider.allowance(mockParams);

				expect(result).toBe(123456n);
			});

			it('should call the allowance method of the contract', async () => {
				const provider = new InfuraErc20Provider(infura);

				await provider.allowance(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledOnce();
				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockAllowance).toHaveBeenCalledOnce();
				expect(mockAllowance).toHaveBeenNthCalledWith(1, mockEthAddress, mockEthAddress2);
			});

			it('should handle errors gracefully', async () => {
				const errorMessage = 'Error fetching balance';
				mockAllowance.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc20Provider(infura);

				await expect(provider.allowance(mockParams)).rejects.toThrow(errorMessage);
			});
		});

		describe('isErc20', () => {
			const mockDecimals = vi.fn();

			const mockParams = {
				contractAddress
			};

			beforeEach(() => {
				vi.clearAllMocks();

				mockDecimals.mockResolvedValue('18');

				mockContract.prototype.decimals =
					mockDecimals as unknown as typeof mockContract.prototype.decimals;
			});

			it('should return true if contract is erc20', async () => {
				const provider = new InfuraErc20Provider(infura);

				const result = await provider.isErc20(mockParams);

				expect(result).toBeTruthy();
			});

			it('should return false on error', async () => {
				const errorMessage = 'Error fetching decimals';
				mockDecimals.mockRejectedValue(new Error(errorMessage));

				const provider = new InfuraErc20Provider(infura);

				const result = await provider.isErc20(mockParams);

				expect(result).toBeFalsy();
			});

			it('should call the decimals method of the contract', async () => {
				const provider = new InfuraErc20Provider(infura);

				await provider.isErc20(mockParams);

				expect(provider).toBeDefined();

				expect(mockContract).toHaveBeenCalledOnce();

				expect(mockContract).toHaveBeenNthCalledWith(
					1,
					...expectedContractParams,
					new mockProvider()
				);

				expect(mockDecimals).toHaveBeenCalledOnce();
			});
		});
	});

	describe('infuraErc20Providers', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = infuraErc20Providers(id);

				expect(provider).toBeInstanceOf(InfuraErc20Provider);

				expect(provider).toHaveProperty('network');
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => infuraErc20Providers(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_infura_erc20_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
