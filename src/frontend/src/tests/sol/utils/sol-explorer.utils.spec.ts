import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { solAccountExplorerUrl } from '$sol/utils/sol-explorer.utils';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('sol-explorer.utils', () => {
	describe('solAccountExplorerUrl', () => {
		it('should substitute the account into the explorer template', () => {
			expect(
				solAccountExplorerUrl({ network: SOLANA_MAINNET_NETWORK, address: mockSolAddress })
			).toBe(`https://solscan.io/account/${mockSolAddress}/`);
		});

		// Devnet carries its cluster as a query after the path, so appending the address to the URL
		// rather than substituting it into the template would put the account after the query.
		it('should keep the cluster query of a non-mainnet explorer', () => {
			const url = solAccountExplorerUrl({
				network: SOLANA_DEVNET_NETWORK,
				address: mockSolAddress
			});

			expect(url).toContain(`account/${mockSolAddress}/`);
			expect(url).toContain('cluster=devnet');
		});

		it('should give no link for a network that is not Solana', () => {
			expect(
				solAccountExplorerUrl({ network: ETHEREUM_NETWORK, address: mockSolAddress })
			).toBeUndefined();
		});

		it('should give no link without a network or an address', () => {
			expect(
				solAccountExplorerUrl({ network: undefined, address: mockSolAddress })
			).toBeUndefined();
			expect(
				solAccountExplorerUrl({ network: SOLANA_MAINNET_NETWORK, address: undefined })
			).toBeUndefined();
		});
	});
});
