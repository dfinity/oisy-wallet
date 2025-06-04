import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { InfuraProvider, infuraProviders } from '$eth/providers/infura.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { InfuraProvider as InfuraProviderLib } from 'ethers/providers';

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

describe('infura.providers', () => {
	const INFURA_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	it('should create the correct map of providers', () => {
		expect(InfuraProviderLib).toHaveBeenCalledTimes(networks.length);

		networks.forEach(({ providers: { infura } }, index) => {
			expect(InfuraProviderLib).toHaveBeenNthCalledWith(index + 1, infura, INFURA_API_KEY);
		});
	});

	describe('infuraProviders', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = infuraProviders(id);

				expect(provider).toBeInstanceOf(InfuraProvider);

				expect(provider).toHaveProperty('network');
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => infuraProviders(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_infura_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
