import {
	SUPPORTED_EVM_MAINNET_NETWORKS,
	SUPPORTED_EVM_TESTNET_NETWORKS
} from '$env/networks/networks-evm/networks.evm.env';
import {
	BTC_MAINNET_NETWORK,
	BTC_REGTEST_NETWORK,
	BTC_TESTNET_NETWORK
} from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK,
	SUPPORTED_SOLANA_MAINNET_NETWORKS
} from '$env/networks/networks.sol.env';
import type * as nearIntentsEnv from '$env/rest/near-intents.env';
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
		it('should combine ICP, enabled Ethereum, EVM, Solana, and Bitcoin networks', () => {
			const result = get(crossChainSwapNetworks);

			expect(result).toEqual([
				ICP_NETWORK,
				ETHEREUM_NETWORK,
				...SUPPORTED_EVM_MAINNET_NETWORKS,
				...SUPPORTED_SOLANA_MAINNET_NETWORKS,
				BTC_MAINNET_NETWORK
			]);
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

			expect(result).toContain(SOLANA_MAINNET_NETWORK);
			expect(result).toContain(SOLANA_DEVNET_NETWORK);
		});

		it('should include only Solana mainnet when testnets are disabled', () => {
			const result = get(crossChainSwapNetworks);

			expect(result).toContain(SOLANA_MAINNET_NETWORK);
			expect(result).not.toContain(SOLANA_DEVNET_NETWORK);
		});

		it('should not include Solana networks when they are disabled by the user', () => {
			setupUserNetworksStore([ETHEREUM_NETWORK.id]);

			const result = get(crossChainSwapNetworks);

			expect(result).toContain(ETHEREUM_NETWORK);
			expect(result).not.toContain(SOLANA_MAINNET_NETWORK);
			expect(result).not.toContain(SOLANA_DEVNET_NETWORK);
		});

		// The vitest env maps to LOCAL, where the NEAR Intents BTC flag is on, so the
		// default assertions above already cover the NEAR-Intents-only combination
		// (Chain Fusion is STAGING-gated and off here).
		it('should not include Bitcoin networks while no provider reaches Bitcoin', async () => {
			vi.resetModules();
			vi.doMock('$env/rest/near-intents.env', async (importOriginal) => ({
				...(await importOriginal<typeof nearIntentsEnv>()),
				NEAR_INTENTS_BTC_SWAP_ENABLED: false
			}));

			try {
				const [
					{ crossChainSwapNetworks: networks },
					{ setupTestnetsStore: setupTestnets },
					{ setupUserNetworksStore: setupNetworks },
					{ BTC_MAINNET_NETWORK: bitcoinMainnet }
				] = await Promise.all([
					import('$lib/derived/cross-chain-networks.derived'),
					import('$tests/utils/testnets.test-utils'),
					import('$tests/utils/user-networks.test-utils'),
					import('$env/networks/networks.btc.env')
				]);

				setupTestnets('reset');
				setupNetworks('allEnabled');

				const result = get(networks);

				expect(result).not.toContain(bitcoinMainnet);
			} finally {
				vi.doUnmock('$env/rest/near-intents.env');
				vi.resetModules();
			}
		});

		it('should include the enabled Bitcoin mainnet network when only Chain Fusion is on', async () => {
			vi.resetModules();
			vi.doMock('$env/chain-fusion-swap.env', () => ({ CHAIN_FUSION_SWAP_ENABLED: true }));
			vi.doMock('$env/rest/near-intents.env', async (importOriginal) => ({
				...(await importOriginal<typeof nearIntentsEnv>()),
				NEAR_INTENTS_BTC_SWAP_ENABLED: false
			}));

			try {
				const [
					{ crossChainSwapNetworks: networks },
					{ setupTestnetsStore: setupTestnets },
					{ setupUserNetworksStore: setupNetworks },
					{ BTC_MAINNET_NETWORK: bitcoinMainnet, BTC_TESTNET_NETWORK: bitcoinTestnet }
				] = await Promise.all([
					import('$lib/derived/cross-chain-networks.derived'),
					import('$tests/utils/testnets.test-utils'),
					import('$tests/utils/user-networks.test-utils'),
					import('$env/networks/networks.btc.env')
				]);

				setupTestnets('reset');
				setupNetworks('allEnabled');

				const result = get(networks);

				expect(result).toContain(bitcoinMainnet);
				// Swap is mainnet-only; the testnet network is dropped downstream by
				// `crossChainSwapNetworksMainnets`, and testnets are off here anyway.
				expect(result).not.toContain(bitcoinTestnet);
			} finally {
				vi.doUnmock('$env/chain-fusion-swap.env');
				vi.doUnmock('$env/rest/near-intents.env');
				vi.resetModules();
			}
		});
	});

	describe('crossChainSwapNetwoksEnvs', () => {
		it('should split networks into mainnets and testnets', () => {
			setupTestnetsStore('enabled');

			const { mainnets, testnets } = get(crossChainSwapNetwoksEnvs);

			expect(mainnets).toEqual([
				ICP_NETWORK,
				ETHEREUM_NETWORK,
				...SUPPORTED_EVM_MAINNET_NETWORKS,
				...SUPPORTED_SOLANA_MAINNET_NETWORKS,
				BTC_MAINNET_NETWORK
			]);

			expect(testnets).toEqual([
				SEPOLIA_NETWORK,
				...SUPPORTED_EVM_TESTNET_NETWORKS,
				SOLANA_DEVNET_NETWORK,
				SOLANA_LOCAL_NETWORK,
				BTC_TESTNET_NETWORK,
				BTC_REGTEST_NETWORK
			]);
		});

		it('should return only mainnets when testnets are disabled', () => {
			const { mainnets, testnets } = get(crossChainSwapNetwoksEnvs);

			expect(mainnets).toEqual([
				ICP_NETWORK,
				ETHEREUM_NETWORK,
				...SUPPORTED_EVM_MAINNET_NETWORKS,
				...SUPPORTED_SOLANA_MAINNET_NETWORKS,
				BTC_MAINNET_NETWORK
			]);

			expect(testnets).toEqual([]);
		});
	});

	describe('crossChainSwapNetworksMainnets', () => {
		it('should derive mainnet networks only', () => {
			const result = get(crossChainSwapNetworksMainnets);

			expect(result).toEqual([
				ICP_NETWORK,
				ETHEREUM_NETWORK,
				...SUPPORTED_EVM_MAINNET_NETWORKS,
				...SUPPORTED_SOLANA_MAINNET_NETWORKS,
				BTC_MAINNET_NETWORK
			]);
		});
	});

	describe('crossChainSwapNetworksMainnetsIds', () => {
		it('should derive mainnet network ids only', () => {
			const result = get(crossChainSwapNetworksMainnetsIds);

			expect(result).toEqual([
				ICP_NETWORK.id,
				ETHEREUM_NETWORK.id,
				...SUPPORTED_EVM_MAINNET_NETWORKS.map((network) => network.id),
				...SUPPORTED_SOLANA_MAINNET_NETWORKS.map((network) => network.id),
				BTC_MAINNET_NETWORK.id
			]);
		});
	});
});
