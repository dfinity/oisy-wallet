import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK
} from '$env/networks/networks.sol.env';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import en from '$tests/mocks/i18n.mock';

describe('network.utils', () => {
	describe('mapNetworkIdToNetwork', () => {
		const networkMap = {
			mainnet: SOLANA_MAINNET_NETWORK,
			devnet: SOLANA_DEVNET_NETWORK,
			local: SOLANA_LOCAL_NETWORK
		};

		it.each(Object.entries(networkMap))(
			'should return "%s" when given the network %s',
			// eslint-disable-next-line local-rules/prefer-object-params
			(solNetowrk, { id }) => {
				expect(mapNetworkIdToNetwork(id)).toEqual(solNetowrk);
			}
		);

		it('should return throw when given an invalid network', () => {
			expect(() => mapNetworkIdToNetwork(parseNetworkId('invalid-network-id'))).toThrow(
				replacePlaceholders(en.init.error.no_solana_network, {
					$network: 'invalid-network-id'
				})
			);
		});
	});
});
