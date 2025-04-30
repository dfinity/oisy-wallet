import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { isUserNetworkEnabled, mapUserNetworks } from '$lib/utils/user-networks.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { mockUserNetworks } from '$tests/mocks/user-networks.mock';
import { mockUserNetworksMap } from '$tests/mocks/user-profile.mock';

describe('user-networks.utils', () => {
	describe('mapUserNetworks', () => {
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

			expect(console.warn).toHaveBeenCalledTimes(1);
			expect(console.warn).toHaveBeenNthCalledWith(
				1,
				`Unknown networkId: ${unknownNetworkId.description}`
			);
		});

		it('should handle empty UserNetworks', () => {
			expect(mapUserNetworks({})).toEqual([]);
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
