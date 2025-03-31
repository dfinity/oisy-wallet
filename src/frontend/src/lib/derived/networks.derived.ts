import { enabledBitcoinNetworks } from '$btc/derived/networks.derived';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID,
	SOLANA_TESTNET_NETWORK_ID
} from '$env/networks/networks.sol.env';
import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import type { Network } from '$lib/types/network';
import { enabledSolanaNetworks } from '$sol/derived/networks.derived';
import { derived, type Readable } from 'svelte/store';

export const networks: Readable<Network[]> = derived(
	[enabledBitcoinNetworks, enabledEthereumNetworks, enabledSolanaNetworks],
	([$enabledBitcoinNetworks, $enabledEthereumNetworks, $enabledSolanaNetworks]) => [
		...$enabledBitcoinNetworks,
		...$enabledEthereumNetworks,
		ICP_NETWORK,
		...$enabledSolanaNetworks
	]
);

interface NetworksEnvs {
	mainnets: Network[];
	testnets: Network[];
}

const networksEnvs: Readable<NetworksEnvs> = derived([networks], ([$networks]) =>
	$networks.reduce<NetworksEnvs>(
		({ mainnets, testnets }, network) => ({
			mainnets: [...mainnets, ...(network.env === 'mainnet' ? [network] : [])],
			testnets: [...testnets, ...(network.env === 'testnet' ? [network] : [])]
		}),
		{ mainnets: [], testnets: [] }
	)
);

export const networksMainnets: Readable<Network[]> = derived(
	[networksEnvs],
	([{ mainnets }]) => mainnets
);

export const networksTestnets: Readable<Network[]> = derived(
	[networksEnvs],
	([{ testnets }]) => testnets
);

export const networkEthereumEnabled: Readable<boolean> = derived([networks], ([$networks]) =>
	$networks.some(({ id }) => id === ETHEREUM_NETWORK_ID)
);

export const networkSepoliaEnabled: Readable<boolean> = derived([networks], ([$networks]) =>
	$networks.some(({ id }) => id === SEPOLIA_NETWORK_ID)
);

export const networkEthereumDisabled: Readable<boolean> = derived(
	[networkEthereumEnabled],
	([$networkEthereumEnabled]) => !$networkEthereumEnabled
);

export const networkSepoliaDisabled: Readable<boolean> = derived(
	[networkSepoliaEnabled],
	([$networkSepoliaEnabled]) => !$networkSepoliaEnabled
);

export const networkBitcoinMainnetEnabled: Readable<boolean> = derived(
	[networksMainnets],
	([$networksMainnets]) => $networksMainnets.some(({ id }) => id === BTC_MAINNET_NETWORK_ID)
);

export const networkBitcoinTestnetEnabled: Readable<boolean> = derived(
	[networksTestnets],
	([$networksTestnets]) => $networksTestnets.some(({ id }) => id === BTC_TESTNET_NETWORK_ID)
);

export const networkBitcoinRegtestEnabled: Readable<boolean> = derived(
	[networksTestnets],
	([$networksTestnets]) => $networksTestnets.some(({ id }) => id === BTC_REGTEST_NETWORK_ID)
);

export const networkBitcoinMainnetDisabled: Readable<boolean> = derived(
	[networkBitcoinMainnetEnabled],
	([$networkBitcoinMainnetEnabled]) => !$networkBitcoinMainnetEnabled
);

export const networkSolanaMainnetEnabled: Readable<boolean> = derived([networks], ([$networks]) =>
	$networks.some(({ id }) => id === SOLANA_MAINNET_NETWORK_ID)
);

export const networkSolanaTestnetEnabled: Readable<boolean> = derived([networks], ([$networks]) =>
	$networks.some(({ id }) => id === SOLANA_TESTNET_NETWORK_ID)
);

export const networkSolanaDevnetEnabled: Readable<boolean> = derived([networks], ([$networks]) =>
	$networks.some(({ id }) => id === SOLANA_DEVNET_NETWORK_ID)
);

export const networkSolanaLocalEnabled: Readable<boolean> = derived([networks], ([$networks]) =>
	$networks.some(({ id }) => id === SOLANA_LOCAL_NETWORK_ID)
);
