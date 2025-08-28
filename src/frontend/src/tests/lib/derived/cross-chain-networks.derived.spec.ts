import {
	SUPPORTED_EVM_MAINNET_NETWORKS,
	SUPPORTED_EVM_TESTNET_NETWORKS
} from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	crossChainSwapNetwoksEnvs,
	crossChainSwapNetworks,
	crossChainSwapNetworksMainnets,
	crossChainSwapNetworksMainnetsIds
} from '$lib/derived/cross-chain-networks.derived';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('cross-chain-swap derived stores', () => {
	beforeEach(() => {
		setupTestnetsStore('reset');
		setupUserNetworksStore('allEnabled');
	});

	describe('crossChainSwapNetworks', () => {
		it('should combine ICP, enabled Ethereum and EVM networks', () => {
			const result = get(crossChainSwapNetworks);

			expect(result).toEqual([ICP_NETWORK, ETHEREUM_NETWORK, ...SUPPORTED_EVM_MAINNET_NETWORKS]);
		});

		it('should include testnet networks when testnets are enabled', () => {
			setupTestnetsStore('enabled');

			const result = get(crossChainSwapNetworks);

			expect(result).toContain(ICP_NETWORK);
			expect(result).toContain(ETHEREUM_NETWORK);
			expect(result).toContain(SEPOLIA_NETWORK);

			SUPPORTED_EVM_MAINNET_NETWORKS.forEach((network) => {
				expect(result).toContain(network);
			});

			SUPPORTED_EVM_TESTNET_NETWORKS.forEach((network) => {
				expect(result).toContain(network);
			});
		});
	});

	describe('crossChainSwapNetwoksEnvs', () => {
		it('should split networks into mainnets and testnets', () => {
			setupTestnetsStore('enabled');

			const { mainnets, testnets } = get(crossChainSwapNetwoksEnvs);

			expect(mainnets).toEqual([ICP_NETWORK, ETHEREUM_NETWORK, ...SUPPORTED_EVM_MAINNET_NETWORKS]);

			expect(testnets).toEqual([SEPOLIA_NETWORK, ...SUPPORTED_EVM_TESTNET_NETWORKS]);
		});

		it('should return only mainnets when testnets are disabled', () => {
			const { mainnets, testnets } = get(crossChainSwapNetwoksEnvs);

			expect(mainnets).toEqual([ICP_NETWORK, ETHEREUM_NETWORK, ...SUPPORTED_EVM_MAINNET_NETWORKS]);

			expect(testnets).toEqual([]);
		});
	});

	describe('crossChainSwapNetworksMainnets', () => {
		it('should derive mainnet networks only', () => {
			const result = get(crossChainSwapNetworksMainnets);

			expect(result).toEqual([ICP_NETWORK, ETHEREUM_NETWORK, ...SUPPORTED_EVM_MAINNET_NETWORKS]);
		});
	});

	describe('crossChainSwapNetworksMainnetsIds', () => {
		it('should derive mainnet network ids only', () => {
			const result = get(crossChainSwapNetworksMainnetsIds);

			expect(result).toEqual([
				ICP_NETWORK.id,
				ETHEREUM_NETWORK.id,
				...SUPPORTED_EVM_MAINNET_NETWORKS.map((network) => network.id)
			]);
		});
	});
});
