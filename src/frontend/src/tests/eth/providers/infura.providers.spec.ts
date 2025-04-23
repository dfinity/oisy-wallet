import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK,
	BSC_TESTNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import {
	ETHEREUM_NETWORK,
	INFURA_NETWORK_BASE,
	INFURA_NETWORK_BASE_SEPOLIA,
	INFURA_NETWORK_BNB_MAINNET,
	INFURA_NETWORK_BNB_TESTNET,
	INFURA_NETWORK_HOMESTEAD,
	INFURA_NETWORK_SEPOLIA,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { InfuraProvider, infuraProviders } from '$eth/providers/infura.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { InfuraProvider as InfuraProviderLib, type Networkish } from 'ethers/providers';

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

describe('infura.providers', () => {
	const INFURA_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [
		ETHEREUM_NETWORK,
		SEPOLIA_NETWORK,
		BASE_NETWORK,
		BASE_SEPOLIA_NETWORK,
		BSC_MAINNET_NETWORK,
		BSC_TESTNET_NETWORK
	];

	const infuraNames: Networkish[] = [
		INFURA_NETWORK_HOMESTEAD,
		INFURA_NETWORK_SEPOLIA,
		INFURA_NETWORK_BASE,
		INFURA_NETWORK_BASE_SEPOLIA,
		INFURA_NETWORK_BNB_MAINNET,
		INFURA_NETWORK_BNB_TESTNET
	];

	it('should create the correct map of providers', () => {
		expect(InfuraProviderLib).toHaveBeenCalledTimes(networks.length);

		networks.forEach((_, index) => {
			expect(InfuraProviderLib).toHaveBeenNthCalledWith(
				index + 1,
				infuraNames[index],
				INFURA_API_KEY
			);
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
			expect(() => infuraProviders(ICP_NETWORK_ID)).toThrowError(
				replacePlaceholders(en.init.error.no_infura_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
