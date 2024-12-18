import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID,
	SOLANA_TESTNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import { balancesStore } from '$lib/stores/balances.store';
import * as toastsStore from '$lib/stores/toasts.store';
import type { TokenId } from '$lib/types/token';
import { loadSolBalance } from '$sol/services/sol-balance.services';
import * as solRpcProviders from '$sol/providers/sol-rpc.providers';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { BigNumber } from '@ethersproject/bignumber';
import { lamports } from '@solana/rpc-types';
import { get } from 'svelte/store';
import { SOLANA_TOKEN_ID } from '$env/tokens/tokens.sol.env';
import {
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	solAddressTestnetStore
} from '$lib/stores/address.store';
import type { MockInstance } from 'vitest';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.env';
import { i18n } from '$lib/stores/i18n.store';

vi.mock('$sol/providers/sol-rpc.providers');

describe('sol-balance.services', () => {
	let spyToastsError: MockInstance;
	const mockLamportsBalance = 500000n;
	const mockTokenId: TokenId = SOLANA_TOKEN_ID;
	let mockGetBalance: MockInstance

	beforeEach(() => {
		vi.clearAllMocks();
		balancesStore.reset(mockTokenId);

		spyToastsError = vi.spyOn(toastsStore, 'toastsError');

		// Mock RPC provider
		mockGetBalance = vi
			.fn()
			.mockReturnValue({ send: () => Promise.resolve({ value: lamports(mockLamportsBalance) }) });
		const mockSolanaHttpRpc = vi.fn().mockReturnValue({ getBalance: mockGetBalance });
		vi.mocked(solRpcProviders.solanaHttpRpc).mockImplementation(mockSolanaHttpRpc);

		// Mock address stores
		solAddressMainnetStore.set({ data: mockSolAddress, certified: false });
		solAddressTestnetStore.set({ data: mockSolAddress, certified: false });
		solAddressDevnetStore.set({ data: mockSolAddress, certified: false });
		solAddressLocalnetStore.set({ data: mockSolAddress, certified: false });
	});

	describe('loadSolBalance', () => {
		it('should handle unknown network', async () => {
			const result = await loadSolBalance({
				networkId: ETHEREUM_NETWORK_ID,
				tokenId: mockTokenId
			});

			expect(result).toEqual({ success: false });
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: get(i18n).init.error.sol_address_unknown }
			});
			expect(get(balancesStore)?.[mockTokenId]).toBeNull();
		});

		it('should handle no address gracefully', async () => {
			solAddressMainnetStore.reset();

			const result = await loadSolBalance({
				networkId: SOLANA_MAINNET_NETWORK_ID,
				tokenId: mockTokenId
			});

			expect(result).toEqual({ success: false });
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: get(i18n).init.error.sol_address_unknown }
			});
			expect(get(balancesStore)?.[mockTokenId]).toBeNull();
		});

		it('should handle RPC errors gracefully', async () => {
			const mockError = new Error('RPC Error');
			mockGetBalance.mockReturnValue({ send: () => Promise.reject(mockError) });
			const balanceResetSpy = vi.spyOn(balancesStore, 'reset');

			const result = await loadSolBalance({
				networkId: SOLANA_MAINNET_NETWORK_ID,
				tokenId: mockTokenId
			});

			expect(result).toEqual({ success: false });
			expect(balanceResetSpy).toHaveBeenCalledWith(mockTokenId);
			expect(spyToastsError).toHaveBeenCalledWith({
				msg: { text: get(i18n).init.error.loading_balance },
				err: mockError
			});
		});

		it('should handle zero balance gracefully', async () => {
			mockGetBalance.mockReturnValue({ send: () => Promise.resolve({ value: lamports(0n) }) });

			const result = await loadSolBalance({
				networkId: SOLANA_MAINNET_NETWORK_ID,
				tokenId: mockTokenId
			});

			expect(result).toEqual({ success: true });
			expect(get(balancesStore)?.[mockTokenId]).toEqual({
				data: BigNumber.from(0),
				certified: false
			});
			expect(spyToastsError).not.toHaveBeenCalled();
		});

		it.each([
			SOLANA_MAINNET_NETWORK_ID,
			SOLANA_TESTNET_NETWORK_ID,
			SOLANA_DEVNET_NETWORK_ID,
			SOLANA_LOCAL_NETWORK_ID
		])('should work with different network IDs: %s', async (networkId) => {
			const result = await loadSolBalance({
				networkId: networkId,
				tokenId: mockTokenId
			});

			expect(result).toEqual({ success: true });
			expect(get(balancesStore)?.[mockTokenId]).toEqual({
				data: BigNumber.from(mockLamportsBalance),
				certified: false
			});
			expect(spyToastsError).not.toHaveBeenCalled();
		});
	});
});
