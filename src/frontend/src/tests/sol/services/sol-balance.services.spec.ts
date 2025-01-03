import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token } from '$lib/types/token';
import { loadSolBalance } from '$sol/services/sol-balance.services';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { get } from 'svelte/store';

describe('sol-balance.services', () => {
	const solanaTokens: Token[] = [SOLANA_TOKEN, SOLANA_TESTNET_TOKEN, SOLANA_DEVNET_TOKEN];

	describe('loadSolBalance', () => {
		it.each(solanaTokens)(
			'should return the balance in SOL of the $name native token for the address',
			async (token) => {
				const result = await loadSolBalance({ address: mockSolAddress, token });

				expect(result).toEqual({ success: true });
				expect(get(balancesStore)?.[token.id]?.data.toNumber()).toBeGreaterThanOrEqual(0);
			}
		);
	}, 60000);
});
