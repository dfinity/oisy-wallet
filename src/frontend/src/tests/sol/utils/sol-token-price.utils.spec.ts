import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import type { SplTokenPriceData } from '$sol/stores/spl-token-price.store';
import { solTokenUsdPrice } from '$sol/utils/sol-token-price.utils';
import { mockSplAddress } from '$tests/mocks/sol.mock';

describe('sol-token-price.utils', () => {
	describe('solTokenUsdPrice', () => {
		const prices: SplTokenPriceData = { mainnet: { [mockSplAddress]: 4 } };

		it('should return the price of a mint on its own cluster', () => {
			expect(
				solTokenUsdPrice({
					tokenAddress: mockSplAddress,
					networkId: SOLANA_MAINNET_NETWORK_ID,
					prices
				})
			).toBe(4);
		});

		// The same address is a different token on devnet, so a mainnet price does not describe it.
		it('should not price a mint with the value it has on another cluster', () => {
			expect(
				solTokenUsdPrice({
					tokenAddress: mockSplAddress,
					networkId: SOLANA_DEVNET_NETWORK_ID,
					prices
				})
			).toBeUndefined();
		});

		it('should return nothing for a mint nothing priced', () => {
			expect(
				solTokenUsdPrice({ tokenAddress: 'unpriced', networkId: SOLANA_MAINNET_NETWORK_ID, prices })
			).toBeUndefined();
		});

		it('should return nothing for a network that is not a Solana cluster', () => {
			expect(
				solTokenUsdPrice({ tokenAddress: mockSplAddress, networkId: ICP_NETWORK_ID, prices })
			).toBeUndefined();
		});
	});
});
