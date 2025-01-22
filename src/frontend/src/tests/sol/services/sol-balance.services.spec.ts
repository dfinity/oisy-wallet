import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_LOCAL_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token } from '$lib/types/token';
import * as solRpcProviders from '$sol/providers/sol-rpc.providers';
import { loadSolBalance } from '$sol/services/sol-balance.services';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { lamports } from '@solana/rpc-types';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$sol/providers/sol-rpc.providers');

describe('sol-balance.services', () => {
	describe('loadSolBalance', () => {
		let mockGetBalance: MockInstance;

		const mockBalance = 500000n;
		const solanaTokens: Token[] = [
			SOLANA_TOKEN,
			SOLANA_TESTNET_TOKEN,
			SOLANA_DEVNET_TOKEN,
			SOLANA_LOCAL_TOKEN
		];

		beforeEach(() => {
			vi.clearAllMocks();

			mockGetBalance = vi
				.fn()
				.mockReturnValue({ send: () => Promise.resolve({ value: lamports(mockBalance) }) });

			const mockSolanaHttpRpc = vi.fn().mockReturnValue({
				getBalance: mockGetBalance
			});
			vi.mocked(solRpcProviders.solanaHttpRpc).mockImplementation(mockSolanaHttpRpc);
		});

		it.each(solanaTokens)(
			'should return the balance in SOL of the $name native token for the address',
			async (token) => {
				const result = await loadSolBalance({ address: mockSolAddress, token });

				expect(result).toEqual({ success: true });
				expect(get(balancesStore)?.[token.id]?.data.toBigInt()).toBe(mockBalance);
			}
		);
	}, 60000);
});
