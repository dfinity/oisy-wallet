import { loadSolLamportsBalance } from '$sol/api/solana.api';
import * as solRpcProviders from '$sol/providers/sol-rpc.providers';
import { SolanaNetworks } from '$sol/types/network';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { lamports } from '@solana/rpc-types';
import type { MockInstance } from 'vitest';

vi.mock('$sol/providers/sol-rpc.providers');

describe('solana.api', () => {
	let mockGetBalance: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock RPC provider
		mockGetBalance = vi
			.fn()
			.mockReturnValue({ send: () => Promise.resolve({ value: lamports(500000n) }) });
		const mockSolanaHttpRpc = vi.fn().mockReturnValue({ getBalance: mockGetBalance });
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
});
