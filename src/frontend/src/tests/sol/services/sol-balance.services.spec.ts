import { SOLANA_TESTNET_TOKEN } from '$env/tokens/tokens.sol.env';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token } from '$lib/types/token';
import { loadSolBalance } from '$sol/services/sol-balance.services';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { get } from 'svelte/store';

describe('sol-balance.services', () => {
	// TODO: change DEVNET to use the normal RPC and not alchemy, and add it to this tests
	const solanaTokens: Token[] = [SOLANA_TESTNET_TOKEN];

	describe('loadSolBalance', () => {
		it.each(solanaTokens)(
			'should return the balance in SOL of the $name native token for the address',
			async (token) => {
				const result = await loadSolBalance({ address: mockSolAddress, token });

				expect(result).toEqual({ success: true });
				expect(get(balancesStore)?.[token.id]?.data.toNumber()).toBeGreaterThanOrEqual(0);
			}
		);
	});
});
