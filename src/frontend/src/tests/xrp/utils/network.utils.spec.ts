import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import { parseNetworkId } from '$lib/validation/network.validation';
import { XrpNetworks } from '$xrp/types/network';
import { mapNetworkIdToNetwork } from '$xrp/utils/network.utils';

describe('network.utils', () => {
	describe('mapNetworkIdToNetwork', () => {
		it('should return "mainnet" when given the XRP mainnet network id', () => {
			expect(mapNetworkIdToNetwork(XRP_MAINNET_NETWORK.id)).toBe(XrpNetworks.mainnet);
		});

		it('should return undefined when given an unrelated network id', () => {
			expect(mapNetworkIdToNetwork(parseNetworkId('invalid-network-id'))).toBeUndefined();
		});
	});
});
