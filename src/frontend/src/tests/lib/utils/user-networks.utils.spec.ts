import { ROBINHOOD_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { isUserNetworkEnabled, mapUserNetworks } from '$lib/utils/user-networks.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { mockUserNetworks, mockUserNetworksComplete } from '$tests/mocks/user-networks.mock';
import { mockUserNetworksMap } from '$tests/mocks/user-profile.mock';

describe('user-networks.utils', () => {
	describe('mapUserNetworks', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should convert UserNetworks to array of [NetworkSettingsFor, NetworkSettings]', () => {
			expect(mapUserNetworks(mockUserNetworks)).toEqual(mockUserNetworksMap);
		});

		it('should ignore unknown network IDs and log them to console', () => {
			const unknownNetworkId = parseNetworkId('unknownNetworkId');
			const userNetworks = {
				...mockUserNetworks,
				[unknownNetworkId]: { enabled: true, isTestnet: false }
			};

			expect(mapUserNetworks(userNetworks)).toEqual(mockUserNetworksMap);

			expect(console.warn).toHaveBeenCalledOnce();
			expect(console.warn).toHaveBeenNthCalledWith(
				1,
				`Unknown networkId: ${unknownNetworkId.description}`
			);
		});

		it('should handle empty UserNetworks', () => {
			expect(mapUserNetworks({})).toEqual([]);
		});

		// The other half of the round trip asserted in `user-networks.derived.spec`. The
		// "map all networks" case below only asserts that nothing throws or warns, so it would
		// not catch a Robinhood key mapped to the wrong variant.
		it('should map the Robinhood Chain network id to its backend key', () => {
			expect(
				mapUserNetworks({
					[ROBINHOOD_MAINNET_NETWORK_ID]: { enabled: true, isTestnet: false }
				})
			).toEqual([[{ RobinhoodMainnet: null }, { enabled: true, is_testnet: false }]]);

			expect(console.warn).not.toHaveBeenCalled();
		});

		it('should be able to map all networks', () => {
			expect(() => mapUserNetworks(mockUserNetworksComplete)).not.toThrow();

			expect(console.warn).not.toHaveBeenCalled();
			expect(console.error).not.toHaveBeenCalled();
		});
	});

	describe('isUserNetworkEnabled', () => {
		it('should return true if network is enabled', () => {
			expect(
				isUserNetworkEnabled({
					userNetworks: {
						...mockUserNetworks,
						[ICP_NETWORK_ID]: { enabled: true, isTestnet: false }
					},
					networkId: ICP_NETWORK_ID
				})
			).toBeTruthy();
		});

		it('should return false if network is disabled', () => {
			expect(
				isUserNetworkEnabled({
					userNetworks: {
						...mockUserNetworks,
						[ICP_NETWORK_ID]: { enabled: false, isTestnet: false }
					},
					networkId: ICP_NETWORK_ID
				})
			).toBeFalsy();
		});

		it('should return false if network is not present', () => {
			expect(
				isUserNetworkEnabled({
					userNetworks: mockUserNetworks,
					networkId: parseNetworkId('unknownNetworkId')
				})
			).toBeFalsy();
		});

		it('should return false there are no user networks', () => {
			expect(
				isUserNetworkEnabled({
					userNetworks: {},
					networkId: ICP_NETWORK_ID
				})
			).toBeFalsy();
		});
	});
});
