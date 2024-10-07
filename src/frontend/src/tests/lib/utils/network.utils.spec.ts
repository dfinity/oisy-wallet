import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks.env';
import { mapNetworkIdToBitcoinNetwork } from '$lib/utils/network.utils';

describe('network utils', () => {
	describe('mapNetworkIdToBitcoinNetwork', () => {
		it('should map network id to bitcoin network', () => {
			expect(mapNetworkIdToBitcoinNetwork(BTC_MAINNET_NETWORK_ID)).toBe('mainnet');
			expect(mapNetworkIdToBitcoinNetwork(BTC_TESTNET_NETWORK_ID)).toBe('testnet');
			expect(mapNetworkIdToBitcoinNetwork(BTC_REGTEST_NETWORK_ID)).toBe('regtest');
		});
	});
});
