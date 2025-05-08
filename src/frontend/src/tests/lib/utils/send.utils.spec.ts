import { BTC_MAINNET_NETWORK_ID, BTC_TESTNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { isInvalidDestinationBtc } from '$lib/utils/send.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';

describe('send.utils', () => {
	describe('isInvalidDestinationBtc', () => {
		it('should return true if network and destination match', () => {
			expect(
				isInvalidDestinationBtc({ destination: mockBtcAddress, networkId: BTC_TESTNET_NETWORK_ID })
			).toBeTruthy();
		});

		it('should return false if network and destination do not match', () => {
			expect(
				isInvalidDestinationBtc({ destination: mockBtcAddress, networkId: BTC_MAINNET_NETWORK_ID })
			).toBeFalsy();
		});
	});
});
