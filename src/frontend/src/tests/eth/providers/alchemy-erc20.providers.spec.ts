import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK,
	BSC_TESTNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import {
	ALCHEMY_JSON_RPC_URL_BASE_MAINNET,
	ALCHEMY_JSON_RPC_URL_BASE_SEPOLIA,
	ALCHEMY_JSON_RPC_URL_BSC_MAINNET,
	ALCHEMY_JSON_RPC_URL_BSC_TESTNET,
	ALCHEMY_JSON_RPC_URL_MAINNET,
	ALCHEMY_JSON_RPC_URL_SEPOLIA,
	ETHEREUM_NETWORK,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	AlchemyErc20Provider,
	alchemyErc20Providers
} from '$eth/providers/alchemy-erc20.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { JsonRpcProvider, type Networkish } from 'ethers/providers';

vi.mock('$env/rest/alchemy.env', () => ({
	ALCHEMY_API_KEY: 'test-api-key'
}));

describe('alchemy-erc20.providers', () => {
	const ALCHEMY_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [
		ETHEREUM_NETWORK,
		SEPOLIA_NETWORK,
		BASE_NETWORK,
		BASE_SEPOLIA_NETWORK,
		BSC_MAINNET_NETWORK,
		BSC_TESTNET_NETWORK
	];

	const alchemyNames: Networkish[] = [
		ALCHEMY_JSON_RPC_URL_MAINNET,
		ALCHEMY_JSON_RPC_URL_SEPOLIA,
		ALCHEMY_JSON_RPC_URL_BASE_MAINNET,
		ALCHEMY_JSON_RPC_URL_BASE_SEPOLIA,
		ALCHEMY_JSON_RPC_URL_BSC_MAINNET,
		ALCHEMY_JSON_RPC_URL_BSC_TESTNET
	];

	it('should create the correct map of providers', () => {
		expect(JsonRpcProvider).toHaveBeenCalledTimes(networks.length);

		networks.forEach((_, index) => {
			expect(JsonRpcProvider).toHaveBeenNthCalledWith(
				index + 1,
				`${alchemyNames[index]}/${ALCHEMY_API_KEY}`
			);
		});
	});

	describe('alchemyErc20Providers', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = alchemyErc20Providers(id);

				expect(provider).toBeInstanceOf(AlchemyErc20Provider);

				expect(provider).toHaveProperty('provider');
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => alchemyErc20Providers(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_alchemy_erc20_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
