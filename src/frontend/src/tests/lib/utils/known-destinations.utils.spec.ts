import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { USDC_TOKEN } from '$env/tokens/tokens-evm/tokens-bsc/tokens-bep20/tokens.usdc.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import type { KnownDestinations } from '$lib/types/transactions';
import { getCaseSensitiveness } from '$lib/utils/address.utils';
import { getKnownDestination } from '$lib/utils/known-destinations.utils';
import { mockEthAddress, mockEthAddress2, mockEthAddress3 } from '$tests/mocks/eth.mocks';
import { mockSolAddress, mockSolAddress2 } from '$tests/mocks/sol.mock';

vi.mock('$lib/utils/address.utils', () => ({
	getCaseSensitiveness: vi.fn()
}));

describe('known-destinations.utils', () => {
	describe('getKnownDestination', () => {
		const mockKnownDestinations: KnownDestinations = {
			[mockSolAddress]: {
				amounts: [{ value: 100n, token: BONK_TOKEN }],
				address: mockSolAddress,
				timestamp: 1
			},
			[mockEthAddress]: {
				amounts: [{ value: 200n, token: ETHEREUM_TOKEN }],
				address: mockEthAddress,
				timestamp: 2
			},
			[mockSolAddress2]: {
				amounts: [{ value: 300n, token: SOLANA_TOKEN }],
				address: mockSolAddress2,
				timestamp: 3
			},
			[mockEthAddress2.toUpperCase()]: {
				amounts: [{ value: 400n, token: USDC_TOKEN }],
				address: mockEthAddress2,
				timestamp: 4
			}
		};

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should get the case sensitiveness for the network', () => {
			getKnownDestination({
				knownDestinations: mockKnownDestinations,
				address: mockEthAddress,
				networkId: ETHEREUM_NETWORK_ID
			});

			getKnownDestination({
				knownDestinations: mockKnownDestinations,
				address: mockEthAddress,
				networkId: SOLANA_MAINNET_NETWORK_ID
			});

			expect(getCaseSensitiveness).toHaveBeenCalledTimes(2);
			expect(getCaseSensitiveness).toHaveBeenNthCalledWith(1, { networkId: ETHEREUM_NETWORK_ID });
			expect(getCaseSensitiveness).toHaveBeenNthCalledWith(2, {
				networkId: SOLANA_MAINNET_NETWORK_ID
			});
		});

		it('should return the known destination for a case-sensitive address', () => {
			vi.mocked(getCaseSensitiveness).mockReturnValue(true);

			const result = getKnownDestination({
				knownDestinations: mockKnownDestinations,
				address: mockEthAddress,
				networkId: ETHEREUM_NETWORK_ID
			});

			expect(result).toBeDefined();
			expect(result).toEqual(mockKnownDestinations[mockEthAddress]);
		});

		it('should return undefined for a case-sensitive address if not matched', () => {
			vi.mocked(getCaseSensitiveness).mockReturnValue(true);

			const result = getKnownDestination({
				knownDestinations: mockKnownDestinations,
				address: mockEthAddress2.toLowerCase(),
				networkId: ETHEREUM_NETWORK_ID
			});

			expect(result).toBeUndefined();
		});

		it('should return the known destination for a case-insensitive address', () => {
			vi.mocked(getCaseSensitiveness).mockReturnValue(false);

			const result = getKnownDestination({
				knownDestinations: mockKnownDestinations,
				address: mockEthAddress2.toLowerCase(),
				networkId: ETHEREUM_NETWORK_ID
			});

			expect(result).toBeDefined();
			expect(result).toEqual(mockKnownDestinations[mockEthAddress2.toUpperCase()]);
		});

		it('should return undefined for a case-insensitive address if not matched', () => {
			vi.mocked(getCaseSensitiveness).mockReturnValue(false);

			const result = getKnownDestination({
				knownDestinations: mockKnownDestinations,
				address: mockEthAddress3,
				networkId: ETHEREUM_NETWORK_ID
			});

			expect(result).toBeUndefined();
		});
	});
});
