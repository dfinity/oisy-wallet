import { customRpcProviders, type CustomRpcProvider } from '$eth/providers/custom-rpc.providers';
import { infuraProviders, type InfuraProvider } from '$eth/providers/infura.providers';
import { customEvmNetworksStore } from '$eth/stores/custom-evm-networks.store';
import type { NetworkId } from '$lib/types/network';
import { get } from 'svelte/store';

/**
 * Structural union of the two concrete EVM provider classes. Both expose
 * the same call surface (`balance`, `getFeeData`, `estimateGas`,
 * `safeEstimateGas`, `sendTransaction`, `getTransactionCount`,
 * `getBlockNumber`), so destructuring callers (`const { balance } = ...`)
 * don't need to branch on which variant they got back.
 */
export type EthProvider = InfuraProvider | CustomRpcProvider;

/**
 * Single entry point for resolving an EVM `NetworkId` to a provider.
 *
 * Built-in chains (Ethereum, Arbitrum, Base, BSC, Polygon, their testnets)
 * continue to use the Infura-backed provider map. User-added custom EVM
 * chains — identified by their presence in `customEvmNetworksStore` —
 * resolve through the generic `CustomRpcProvider` cache instead. Custom
 * chains are checked first so a future collision (e.g. a chainId that
 * somehow appears in both maps) deterministically resolves to the user's
 * stored RPC URL rather than the Infura endpoint.
 *
 * Unknown network IDs throw via `infuraProviders`, preserving the existing
 * behaviour for call sites that rely on the thrown error message.
 */
export const ethProviders = (networkId: NetworkId): EthProvider => {
	const customNetwork = get(customEvmNetworksStore).find(({ id }) => id === networkId);
	if (customNetwork !== undefined) {
		return customRpcProviders(customNetwork);
	}
	return infuraProviders(networkId);
};
