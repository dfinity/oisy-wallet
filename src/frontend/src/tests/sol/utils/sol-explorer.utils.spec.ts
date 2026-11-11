import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_DEVNET_NETWORK, SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import {
	solAccountExplorerUrl,
	solTokenExplorerUrl,
	solTransactionExplorerUrl
} from '$sol/utils/sol-explorer.utils';
import { mockCkSolSweepSignature } from '$tests/mocks/cksol.mock';
import { mockSolAddress, mockSplAddress } from '$tests/mocks/sol.mock';

describe('sol-explorer.utils', () => {
	describe('solTransactionExplorerUrl', () => {
		it('should substitute the signature into the explorer template', () => {
			expect(
				solTransactionExplorerUrl({
					network: SOLANA_MAINNET_NETWORK,
					signature: mockCkSolSweepSignature
				})
			).toBe(`https://solscan.io/tx/${mockCkSolSweepSignature}/`);
		});

		it('should keep the cluster query of a non-mainnet explorer', () => {
			const url = solTransactionExplorerUrl({
				network: SOLANA_DEVNET_NETWORK,
				signature: mockCkSolSweepSignature
			});

			expect(url).toContain(`tx/${mockCkSolSweepSignature}/`);
			expect(url).toContain('cluster=devnet');
		});

		it('should give no link for a network that is not Solana', () => {
			expect(
				solTransactionExplorerUrl({ network: ETHEREUM_NETWORK, signature: mockCkSolSweepSignature })
			).toBeUndefined();
		});

		it('should give no link without a network or a signature', () => {
			expect(
				solTransactionExplorerUrl({ network: undefined, signature: mockCkSolSweepSignature })
			).toBeUndefined();
			expect(
				solTransactionExplorerUrl({ network: SOLANA_MAINNET_NETWORK, signature: undefined })
			).toBeUndefined();
		});
	});

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

	describe('solTokenExplorerUrl', () => {
		it('should substitute the token into the explorer template', () => {
			expect(
				solTokenExplorerUrl({ network: SOLANA_MAINNET_NETWORK, tokenAddress: mockSplAddress })
			).toBe(`https://solscan.io/token/${mockSplAddress}/`);
		});

		it('should keep the cluster query of a non-mainnet explorer', () => {
			const url = solTokenExplorerUrl({
				network: SOLANA_DEVNET_NETWORK,
				tokenAddress: mockSplAddress
			});

			expect(url).toContain(`token/${mockSplAddress}/`);
			expect(url).toContain('cluster=devnet');
		});

		it('should give no link for a network that is not Solana', () => {
			expect(
				solTokenExplorerUrl({ network: ETHEREUM_NETWORK, tokenAddress: mockSplAddress })
			).toBeUndefined();
		});

		it('should give no link without a network or a token', () => {
			expect(
				solTokenExplorerUrl({ network: undefined, tokenAddress: mockSplAddress })
			).toBeUndefined();
			expect(
				solTokenExplorerUrl({ network: SOLANA_MAINNET_NETWORK, tokenAddress: undefined })
			).toBeUndefined();
		});
	});
});
