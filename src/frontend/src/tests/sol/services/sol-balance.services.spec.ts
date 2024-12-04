import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SOLANA_TESTNET_NETWORK
} from '$env/networks.sol.env';
import { getLamportsBalance, getSolBalance } from '$sol/services/sol-balance.services';
import type { SolNetwork } from '$sol/types/network';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('sol-balance-services', () => {
	const solanaNetworks: SolNetwork[] = [
		SOLANA_MAINNET_NETWORK,
		SOLANA_TESTNET_NETWORK,
		SOLANA_DEVNET_NETWORK
	];

	describe('getLamportsBalance', () => {
		it.each(solanaNetworks)(
			'should return the balance in lamports for the address on the $name network',
			async (network) => {
				const balance = await getLamportsBalance({ address: mockSolAddress, network });

				console.log(balance);

				expect(balance).toBeGreaterThanOrEqual(0);
			}
		);
	});

	describe('getSolBalance', () => {
		it.each(solanaNetworks)(
			'should return the balance in SOL for the address on the $name network',
			async (network) => {
				const balance = await getSolBalance({ address: mockSolAddress, network });

				console.log(balance);

				expect(balance).toBeGreaterThanOrEqual(0);
			}
		);
	});
});
