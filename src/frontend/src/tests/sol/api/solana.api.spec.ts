import * as solRpcProviders from '$sol/providers/sol-rpc.providers';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { BigNumber } from '@ethersproject/bignumber';
import type { MockInstance } from 'vitest';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { loadSolBalance } from '$sol/api/solana.api';
import { lamports } from '@solana/rpc-types';

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
			const balance = await loadSolBalance({
				address: mockSolAddress,
				networkId: SOLANA_MAINNET_NETWORK_ID
			});

			expect(balance).toEqual(BigNumber.from(500000));
			expect(mockGetBalance).toHaveBeenCalled();
		});

		it('should handle zero balance', async () => {
			mockGetBalance.mockReturnValue({ send: () => Promise.resolve({ value: lamports(0n) }) });

			const balance = await loadSolBalance({
				address: mockSolAddress,
				networkId: SOLANA_MAINNET_NETWORK_ID
			});

			expect(balance).toEqual(BigNumber.from(0));
		});

		it('should throw error when RPC call fails', async () => {
			const mockError = new Error('RPC Error');
			mockGetBalance.mockReturnValue({ send: () => Promise.reject(mockError) });

			await expect(
				loadSolBalance({
					address: mockSolAddress,
					networkId: SOLANA_MAINNET_NETWORK_ID
				})
			).rejects.toThrow('RPC Error');
		});

		it('should throw error when address is null', async () => {
			await expect(
				loadSolBalance({
					address: null as any,
					networkId: SOLANA_MAINNET_NETWORK_ID
				})
			).rejects.toThrow();
		});

		it('should throw error when networkId is null', async () => {
			await expect(
				loadSolBalance({
					address: mockSolAddress,
					networkId: null as any
				})
			).rejects.toThrow();
		});
	});
});