import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks/networks.sol.env';
import { loadLamportsBalance, loadSolBalance } from '$sol/services/sol-balance.services';
import type { SolNetwork } from '$sol/types/network';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('sol-balance.services', () => {
	const solanaNetworks: SolNetwork[] = [
		SOLANA_MAINNET_NETWORK,
		SOLANA_TESTNET_NETWORK,
		SOLANA_DEVNET_NETWORK
	];

	describe('loadLamportsBalance', () => {
		it.each(solanaNetworks)(
			'should return the balance in lamports for the address on the $name network',
			async (network) => {
				const balance = await loadLamportsBalance({ address: mockSolAddress, network });

				expect(balance).toBeGreaterThanOrEqual(0);
			}
		);
	}, 60000);

	describe('loadSolBalance', () => {
		it.each(solanaNetworks)(
			'should return the balance in SOL for the address on the $name network',
			async (network) => {
				const balance = await loadSolBalance({ address: mockSolAddress, network });

				expect(balance).toBeGreaterThanOrEqual(0);
			}
		);
	}, 60000);
});
