import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_BITCOIN_NETWORKS } from '$env/networks/networks.btc.env';
import {
	ETHEREUM_NETWORK,
	SEPOLIA_NETWORK,
	SUPPORTED_ETHEREUM_NETWORKS
} from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_NETWORKS } from '$env/networks/networks.sol.env';
import { explorerUrl, selectedEthereumNetwork } from '$eth/derived/network.derived';
import type { EthereumNetwork } from '$eth/types/network';
import type { Network } from '$lib/types/network';
import { mockPage } from '$tests/mocks/page.store.mock';
import { setupTestnetsStore } from '$tests/utils/testnets.test-utils';
import { setupUserNetworksStore } from '$tests/utils/user-networks.test-utils';
import { get } from 'svelte/store';

describe('network.derived', () => {
	describe('selectedEthereumNetwork', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();

			setupTestnetsStore('enabled');
			setupUserNetworksStore('allEnabled');
		});

		it('should return the current network if it is an Ethereum network', () => {
			const networks: Network[] = [ETHEREUM_NETWORK, SEPOLIA_NETWORK];

			networks.forEach((network) => {
				mockPage.mock({ network: network.id.description });

				expect(get(selectedEthereumNetwork)).toEqual(network);
			});
		});

		it('should return `undefined` if it is not an Ethereum network', () => {
			const networks: Network[] = [
				ICP_NETWORK,
				...SUPPORTED_BITCOIN_NETWORKS,
				...SUPPORTED_SOLANA_NETWORKS,
				...SUPPORTED_EVM_NETWORKS
			];

			networks.forEach((network) => {
				mockPage.mock({ network: network.id.description });

				expect(get(selectedEthereumNetwork)).toBeUndefined();
			});
		});

		it('should return `undefined` if Sepolia network is disabled', () => {
			setupTestnetsStore('disabled');

			mockPage.mock({ network: SEPOLIA_NETWORK.id.description });

			expect(get(selectedEthereumNetwork)).toBeUndefined();
		});

		it('should return `undefined` if no match is found', () => {
			mockPage.mock({ network: 'mockNetwork' });

			expect(get(selectedEthereumNetwork)).toBeUndefined();
		});
	});

	describe('explorerUrl', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();

			setupTestnetsStore('enabled');
			setupUserNetworksStore('allEnabled');
		});

		it('should return selected network explorer URL if it is an Ethereum network or and EVM network', () => {
			const networks: EthereumNetwork[] = [
				...SUPPORTED_ETHEREUM_NETWORKS,
				...SUPPORTED_EVM_NETWORKS
			];

			networks.forEach((network) => {
				mockPage.mock({ network: network.id.description });

				expect(get(explorerUrl)).toEqual(network.explorerUrl);
			});
		});

		it('should fallback to fallback network explorer URL if it is not an Ethereum network nor and EVM network', () => {
			const networks: Network[] = [
				ICP_NETWORK,
				...SUPPORTED_BITCOIN_NETWORKS,
				...SUPPORTED_SOLANA_NETWORKS
			];

			networks.forEach((network) => {
				mockPage.mock({ network: network.id.description });

				expect(get(explorerUrl)).toEqual(ETHEREUM_NETWORK.explorerUrl);
			});
		});

		it('should fallback to fallback network explorer URL if no match is found', () => {
			mockPage.mock({ network: 'mockNetwork' });

			expect(get(explorerUrl)).toEqual(ETHEREUM_NETWORK.explorerUrl);
		});
	});
});
