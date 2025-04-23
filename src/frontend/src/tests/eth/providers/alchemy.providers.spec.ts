import {
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BSC_MAINNET_NETWORK,
	BSC_TESTNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import {
	ALCHEMY_NETWORK_BASE_MAINNET,
	ALCHEMY_NETWORK_BASE_SEPOLIA,
	ALCHEMY_NETWORK_BSC_MAINNET,
	ALCHEMY_NETWORK_BSC_TESTNET,
	ALCHEMY_NETWORK_MAINNET,
	ALCHEMY_NETWORK_SEPOLIA,
	ETHEREUM_NETWORK,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { AlchemyProvider, alchemyProviders } from '$eth/providers/alchemy.providers';
import type { EthereumNetwork } from '$eth/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { Alchemy, type Network } from 'alchemy-sdk';
import { vi } from 'vitest';

vi.mock(import('alchemy-sdk'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		Alchemy: vi.fn()
	};
});

vi.mock('$env/rest/alchemy.env', () => ({
	ALCHEMY_API_KEY: 'test-api-key'
}));

describe('alchemy.providers', () => {
	const ALCHEMY_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [
		ETHEREUM_NETWORK,
		SEPOLIA_NETWORK,
		BASE_NETWORK,
		BASE_SEPOLIA_NETWORK,
		BSC_MAINNET_NETWORK,
		BSC_TESTNET_NETWORK
	];

	const alchemyNames: Network[] = [
		ALCHEMY_NETWORK_MAINNET,
		ALCHEMY_NETWORK_SEPOLIA,
		ALCHEMY_NETWORK_BASE_MAINNET,
		ALCHEMY_NETWORK_BASE_SEPOLIA,
		ALCHEMY_NETWORK_BSC_MAINNET,
		ALCHEMY_NETWORK_BSC_TESTNET
	];

	it('should create the correct map of providers', () => {
		expect(Alchemy).toHaveBeenCalledTimes(networks.length);

		networks.forEach((_, index) => {
			expect(Alchemy).toHaveBeenNthCalledWith(index + 1, {
				apiKey: ALCHEMY_API_KEY,
				network: alchemyNames[index]
			});
		});
	});

	describe('alchemyProviders', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = alchemyProviders(id);

				expect(provider).toBeInstanceOf(AlchemyProvider);

				expect(provider).toHaveProperty('provider');
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => alchemyProviders(ICP_NETWORK_ID)).toThrowError(
				replacePlaceholders(en.init.error.no_alchemy_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
