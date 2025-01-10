import { getSolTransactions, loadSolLamportsBalance } from '$sol/api/solana.api';
import * as solRpcProviders from '$sol/providers/sol-rpc.providers';
import { SolanaNetworks } from '$sol/types/network';
import {
	mockSolSignature,
	mockSolSignatureResponse,
	mockSolSignatureWithErrorResponse
} from '$tests/mocks/sol-signatures.mock';
import { mockSolRpcSendTransaction } from '$tests/mocks/sol-transactions.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { lamports } from '@solana/rpc-types';
import type { MockInstance } from 'vitest';

vi.mock('$sol/providers/sol-rpc.providers');

describe('solana.api', () => {
	let mockGetBalance: MockInstance;
	let mockGetSignaturesForAddress: MockInstance;
	let mockGetTransaction: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		mockGetBalance = vi
			.fn()
			.mockReturnValue({ send: () => Promise.resolve({ value: lamports(500000n) }) });

		mockGetSignaturesForAddress = vi.fn().mockReturnValue({
			send: () => Promise.resolve([mockSolSignatureResponse(), mockSolSignatureResponse()])
		});

		mockGetTransaction = vi.fn().mockReturnValue({
			send: () => Promise.resolve(mockSolRpcSendTransaction)
		});

		const mockSolanaHttpRpc = vi.fn().mockReturnValue({
			getBalance: mockGetBalance,
			getSignaturesForAddress: mockGetSignaturesForAddress,
			getTransaction: mockGetTransaction
		});
		vi.mocked(solRpcProviders.solanaHttpRpc).mockImplementation(mockSolanaHttpRpc);
	});

	describe('loadSolBalance', () => {
		it('should load balance successfully', async () => {
			const balance = await loadSolLamportsBalance({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(balance).toEqual(500000n);
			expect(mockGetBalance).toHaveBeenCalled();
		});

		it('should handle zero balance', async () => {
			mockGetBalance.mockReturnValue({ send: () => Promise.resolve({ value: lamports(0n) }) });

			const balance = await loadSolLamportsBalance({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(balance).toEqual(0n);
		});

		it('should throw error when RPC call fails', async () => {
			const mockError = new Error('RPC Error');
			mockGetBalance.mockReturnValue({ send: () => Promise.reject(mockError) });

			await expect(
				loadSolLamportsBalance({
					address: mockSolAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow('RPC Error');
		});

		it('should throw error when address is empty', async () => {
			await expect(
				loadSolLamportsBalance({
					address: '',
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow();
		});
	});

	describe('getSolTransactions', () => {
		it('should fetch transactions successfully', async () => {
			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(2);
			expect(mockGetSignaturesForAddress).toHaveBeenCalledTimes(1);
			expect(mockGetTransaction).toHaveBeenCalledTimes(2);
		});

		it('should handle before parameter', async () => {
			const signature = mockSolSignature();
			await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				before: signature
			});

			expect(mockGetSignaturesForAddress).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					before: signature
				})
			);
		});

		it('should handle limit parameter', async () => {
			await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				limit: 5
			});

			expect(mockGetSignaturesForAddress).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					limit: 5
				})
			);
		});

		it('should fetch transactions in multiple batches until limit is reached', async () => {
			const lastSignatureFromFirstBatch = mockSolSignatureResponse();

			mockGetSignaturesForAddress
				.mockReturnValueOnce({
					send: () =>
						Promise.resolve([
							mockSolSignatureResponse(),
							mockSolSignatureResponse(),
							mockSolSignatureResponse(),
							mockSolSignatureWithErrorResponse(),
							lastSignatureFromFirstBatch
						])
				})
				.mockReturnValueOnce({
					send: () => Promise.resolve([mockSolSignatureResponse(), mockSolSignatureResponse()])
				});

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				limit: 5
			});

			expect(transactions).toHaveLength(5);
			expect(mockGetSignaturesForAddress).toHaveBeenCalledTimes(2);
			// Verify the second call uses the last signature from first batch for pagination
			expect(mockGetSignaturesForAddress).toHaveBeenLastCalledWith(
				expect.anything(),
				expect.objectContaining({
					before: lastSignatureFromFirstBatch.signature
				})
			);
		});

		it('should stop fetching when no more signatures are available', async () => {
			mockGetSignaturesForAddress
				.mockReturnValueOnce({
					send: () => Promise.resolve([mockSolSignatureResponse(), mockSolSignatureResponse()])
				})
				// Second batch returns empty array
				.mockReturnValueOnce({
					send: () => Promise.resolve([])
				});

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet,
				limit: 5
			});

			expect(transactions).toHaveLength(2);
			expect(mockGetSignaturesForAddress).toHaveBeenCalledTimes(1);
		});

		it('should handle empty signatures response', async () => {
			mockGetSignaturesForAddress.mockReturnValue({
				send: () => Promise.resolve([])
			});

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
			expect(mockGetTransaction).not.toHaveBeenCalled();
		});

		it('should filter out signatures with errors', async () => {
			mockGetSignaturesForAddress.mockReturnValue({
				send: () =>
					Promise.resolve([mockSolSignatureResponse(), mockSolSignatureWithErrorResponse()])
			});

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(1);
			expect(mockGetTransaction).toHaveBeenCalledTimes(1);
		});

		it('should handle null transaction responses', async () => {
			mockGetSignaturesForAddress.mockReturnValue({
				send: () => Promise.resolve([mockSolSignatureResponse()])
			});
			mockGetTransaction.mockReturnValue({
				send: () => Promise.resolve(null)
			});

			const transactions = await getSolTransactions({
				address: mockSolAddress,
				network: SolanaNetworks.mainnet
			});

			expect(transactions).toHaveLength(0);
		});

		it('should handle RPC errors gracefully', async () => {
			mockGetSignaturesForAddress.mockReturnValue({
				send: () => Promise.reject(new Error('RPC Error'))
			});

			await expect(
				getSolTransactions({
					address: mockSolAddress,
					network: SolanaNetworks.mainnet
				})
			).rejects.toThrow('RPC Error');
		});
	});
});
