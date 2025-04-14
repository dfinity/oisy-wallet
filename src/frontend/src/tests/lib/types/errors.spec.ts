import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { LoadIdbAddressError } from '$lib/types/errors';

describe('errors', () => {
	describe('LoadIdbAddressError', () => {
		const mockNetworkId = ETHEREUM_NETWORK_ID;

		it('should be an instance of Error', () => {
			const errorObj = new LoadIdbAddressError(mockNetworkId);

			expect(errorObj).toBeInstanceOf(Error);
		});

		it('should return correct network ID', () => {
			const errorObj = new LoadIdbAddressError(mockNetworkId);

			expect(errorObj.networkId).toBe(mockNetworkId);
		});

		it('should have default error properties', () => {
			const errorObj = new LoadIdbAddressError(mockNetworkId);

			expect(errorObj.name).toBe('Error');
			expect(errorObj.message).toBe('');
		});
	});
});
