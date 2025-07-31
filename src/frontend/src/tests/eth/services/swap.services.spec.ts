import { ETHEREUM_NETWORK, ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import * as infuraProvidersLib from '$eth/providers/infura.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import * as ethTransactionServicesLib from '$eth/services/eth-transaction.services';
import { processTransactionSent } from '$eth/services/eth-transaction.services';
import { swap } from '$eth/services/swap.services';
import * as signerApiLib from '$lib/api/signer.api';
import { signTransaction } from '$lib/api/signer.api';
import { ProgressStepsSwap } from '$lib/enums/progress-steps';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { TransactionParams } from '@velora-dex/sdk';
import { InfuraProvider as InfuraProviderLib, type TransactionResponse } from 'ethers/providers';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('ethers/providers', () => {
	const provider = vi.fn();
	provider.prototype.getTransactionCount = vi.fn();
	provider.prototype.sendTransaction = vi.fn();
	return { InfuraProvider: provider };
});

vi.mock('$eth/services/eth-transaction.services', () => ({
	processTransactionSent: vi.fn()
}));

vi.mock('$lib/api/signer.api', () => ({
	signTransaction: vi.fn()
}));

describe('swap.services', () => {
	describe('swap', () => {
		const mockNonce = 42;
		const mockTransactionHash = '0x1234567890abcdef';
		const mockRawTransaction = '0xabcdef1234567890';

		const mockTransactionParams: TransactionParams = {
			data: '0x1234',
			gas: '21000',
			chainId: 1,
			value: '0',
			from: '0x001',
			to: '0x0002'
		};

		const mockSwapParams = {
			progress: vi.fn(),
			token: ETHEREUM_TOKEN,
			transaction: mockTransactionParams,
			from: mockEthAddress,
			to: mockEthAddress2,
			sourceNetwork: ETHEREUM_NETWORK,
			identity: mockIdentity,
			maxFeePerGas: 30000000000n,
			maxPriorityFeePerGas: 2000000000n
		};

		const mockTransactionResponse: TransactionResponse = {
			hash: mockTransactionHash,
			nonce: mockNonce,
			gasLimit: 21000n,
			gasPrice: 20000000000n,
			to: mockEthAddress2,
			value: 0n,
			data: '0x1234',
			chainId: 1,
			from: mockEthAddress,
			wait: vi.fn(),
			confirmations: 0,
			blockNumber: undefined,
			blockHash: undefined,
			timestamp: undefined,
			raw: mockRawTransaction
		} as unknown as TransactionResponse;

		const mockError = new Error('Error during swap');

		const mockGetTransactionCount = vi.fn();
		const mockSendTransaction = vi.fn();
		const mockProvider = vi.mocked(InfuraProviderLib);

		let spyGet: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();

			spyGet = vi.spyOn({ get }, 'get');
			spyGet.mockReturnValue(en);

			vi.spyOn(infuraProvidersLib, 'infuraProviders');
			vi.spyOn(ethTransactionServicesLib, 'processTransactionSent');
			vi.spyOn(signerApiLib, 'signTransaction');

			mockProvider.prototype.getTransactionCount = mockGetTransactionCount;
			mockProvider.prototype.broadcastTransaction = mockSendTransaction;
			mockGetTransactionCount.mockResolvedValue(mockNonce);
			mockSendTransaction.mockResolvedValue(mockTransactionResponse);

			vi.mocked(signTransaction).mockResolvedValue(mockRawTransaction);
		});

		it('should perform swap successfully', async () => {
			const result = await swap(mockSwapParams);

			expect(result).toEqual({ hash: mockTransactionHash });

			expect(infuraProviders).toHaveBeenCalled();
			expect(mockGetTransactionCount).toHaveBeenCalledOnce();

			expect(infuraProviders).toHaveBeenNthCalledWith(1, ETHEREUM_NETWORK_ID);
			expect(mockGetTransactionCount).toHaveBeenNthCalledWith(1, mockEthAddress, 'pending');
		});

		it('should call progress with correct step', async () => {
			await swap(mockSwapParams);

			expect(mockSwapParams.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
		});

		it('should call signTransaction with correct parameters', async () => {
			await swap(mockSwapParams);

			expect(signTransaction).toHaveBeenCalledOnce();
			expect(signTransaction).toHaveBeenNthCalledWith(1, {
				identity: mockIdentity,
				transaction: {
					to: mockEthAddress2,
					max_fee_per_gas: 30000000000n,
					max_priority_fee_per_gas: 2000000000n,
					nonce: BigInt(mockNonce),
					data: ['0x1234'],
					gas: BigInt('21000'),
					chain_id: BigInt(1),
					value: BigInt('0')
				},
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should call sendTransaction with raw transaction', async () => {
			await swap(mockSwapParams);

			expect(mockSendTransaction).toHaveBeenCalledOnce();
			expect(mockSendTransaction).toHaveBeenNthCalledWith(1, mockRawTransaction);
		});

		it('should call processTransactionSent with correct parameters', async () => {
			await swap(mockSwapParams);

			expect(processTransactionSent).toHaveBeenCalledOnce();
			expect(processTransactionSent).toHaveBeenNthCalledWith(1, {
				token: ETHEREUM_TOKEN,
				transaction: mockTransactionResponse
			});
		});

		it('should handle transaction with null data correctly', async () => {
			const paramsWithNullData = {
				...mockSwapParams,
				transaction: { ...mockTransactionParams, data: null as unknown as string }
			};

			await swap(paramsWithNullData);

			expect(signTransaction).toHaveBeenCalledWith({
				identity: mockIdentity,
				transaction: {
					to: mockEthAddress2,
					max_fee_per_gas: 30000000000n,
					max_priority_fee_per_gas: 2000000000n,
					nonce: BigInt(mockNonce),
					data: [],
					gas: BigInt('21000'),
					chain_id: BigInt(1),
					value: BigInt('0')
				},
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should handle transaction with non-zero value', async () => {
			const paramsWithValue = {
				...mockSwapParams,
				transaction: { ...mockTransactionParams, value: '1000000000000000000' }
			};

			await swap(paramsWithValue);

			expect(signTransaction).toHaveBeenCalledWith({
				identity: mockIdentity,
				transaction: {
					to: mockEthAddress2,
					max_fee_per_gas: 30000000000n,
					max_priority_fee_per_gas: 2000000000n,
					nonce: BigInt(mockNonce),
					data: ['0x1234'],
					gas: BigInt('21000'),
					chain_id: BigInt(1),
					value: BigInt('1000000000000000000')
				},
				nullishIdentityErrorMessage: en.auth.error.no_internet_identity
			});
		});

		it('should throw error if transaction gas is nullish', async () => {
			const paramsWithNullishGas = {
				...mockSwapParams,
				transaction: { ...mockTransactionParams, gas: null as unknown as string }
			};

			await expect(swap(paramsWithNullishGas)).rejects.toThrow(en.send.error.erc20_data_undefined);

			expect(mockSwapParams.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
			expect(infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			expect(mockGetTransactionCount).toHaveBeenCalledWith(mockEthAddress, 'pending');
		});

		it('should handle error when getting transaction count', async () => {
			mockGetTransactionCount.mockRejectedValue(mockError);

			await expect(swap(mockSwapParams)).rejects.toThrow(mockError);

			expect(mockSwapParams.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
			expect(infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			expect(mockGetTransactionCount).toHaveBeenCalledWith(mockEthAddress, 'pending');
			expect(signTransaction).not.toHaveBeenCalled();
		});

		it('should handle error when signing transaction', async () => {
			vi.mocked(signTransaction).mockRejectedValue(mockError);

			await expect(swap(mockSwapParams)).rejects.toThrow(mockError);

			expect(mockSwapParams.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
			expect(infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			expect(mockGetTransactionCount).toHaveBeenCalledWith(mockEthAddress, 'pending');
			expect(signTransaction).toHaveBeenCalled();
			expect(mockSendTransaction).not.toHaveBeenCalled();
		});

		it('should handle error when sending transaction', async () => {
			mockSendTransaction.mockRejectedValue(mockError);

			await expect(swap(mockSwapParams)).rejects.toThrow(mockError);

			expect(mockSwapParams.progress).toHaveBeenCalledWith(ProgressStepsSwap.SWAP);
			expect(infuraProviders).toHaveBeenCalledWith(ETHEREUM_NETWORK_ID);
			expect(mockGetTransactionCount).toHaveBeenCalledWith(mockEthAddress, 'pending');
			expect(signTransaction).toHaveBeenCalled();
			expect(mockSendTransaction).toHaveBeenCalledWith(mockRawTransaction);
			expect(processTransactionSent).not.toHaveBeenCalled();
		});
	});
});
