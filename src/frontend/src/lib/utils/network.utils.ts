import {
	BITCOIN_NETWORKS_IDS,
	ICP_NETWORK_ID,
	SUPPORTED_ETHEREUM_NETWORKS_IDS
} from '$env/networks.env';
import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export const isNetworkICP = (network: Network | undefined): boolean => isNetworkIdICP(network?.id);

export const isNetworkIdICP = (id: NetworkId | undefined): id is typeof ICP_NETWORK_ID =>
	nonNullish(id) && ICP_NETWORK_ID === id;

export const isNetworkIdEthereum = (id: NetworkId | undefined): boolean =>
	nonNullish(id) && SUPPORTED_ETHEREUM_NETWORKS_IDS.includes(id);

export const isNetworkIdBitcoin = (id: NetworkId | undefined): boolean =>
	nonNullish(id) && BITCOIN_NETWORKS_IDS.includes(id);

/**
 * Filter the tokens that either lives on the selected network or, if no network is provided, pseud Chain Fusion, then those that are not testnets.
 */
export const filterTokensForSelectedNetwork = <T extends Token>([
	$tokens,
	$selectedNetwork,
	$pseudoNetworkChainFusion
]: [T[], Network | undefined, boolean]): T[] =>
	$tokens.filter((token) => {
		const {
			network: { id: networkId, env }
		} = token;

		return (
			($pseudoNetworkChainFusion && !isTokenIcrcTestnet(token) && env !== 'testnet') ||
			$selectedNetwork?.id === networkId
		);
	});
