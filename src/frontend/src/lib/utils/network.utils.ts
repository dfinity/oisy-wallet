import type { BitcoinNetwork as SignerBitcoinNetwork } from '$declarations/signer/signer.did';
import {
	BITCOIN_NETWORKS_IDS,
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID,
	ICP_NETWORK_ID,
	SUPPORTED_ETHEREUM_NETWORKS_IDS
} from '$env/networks.env';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { nonNullish } from '@dfinity/utils';

export const isNetworkICP = (network: Network | undefined): boolean => isNetworkIdICP(network?.id);

export const isNetworkIdICP = (id: NetworkId | undefined): id is typeof ICP_NETWORK_ID =>
	nonNullish(id) && ICP_NETWORK_ID === id;

export const isNetworkETH = (network: Network | undefined): boolean =>
	isNetworkIdEthereum(network?.id);

export const isNetworkIdEthereum = (id: NetworkId | undefined): boolean =>
	nonNullish(id) && SUPPORTED_ETHEREUM_NETWORKS_IDS.includes(id);

export const isNetworkBTC = (network: Network | undefined): boolean =>
	isNetworkIdBitcoin(network?.id);

export const isNetworkIdBitcoin = (id: NetworkId | undefined): boolean =>
	nonNullish(id) && BITCOIN_NETWORKS_IDS.includes(id);

export const isNetworkIdBTCMainnet = (networkId: NetworkId | undefined): boolean =>
	BTC_MAINNET_NETWORK_ID === networkId;

export const isNetworkIdBTCTestnet = (networkId: NetworkId | undefined): boolean =>
	BTC_TESTNET_NETWORK_ID === networkId;

export const isNetworkIdBTCRegtest = (networkId: NetworkId | undefined): boolean =>
	BTC_REGTEST_NETWORK_ID === networkId;

/**
 * Filter the tokens that either lives on the selected network or, if no network is provided, pseud Chain Fusion, then those that are not testnets.
 */
export const filterTokensForSelectedNetwork = <T extends Token>([
	$tokens,
	$selectedNetwork,
	$pseudoNetworkChainFusion
]: [T[], Network | undefined, boolean]): T[] =>
	$tokens.filter(
		({ network: { id: networkId } }) =>
			$pseudoNetworkChainFusion || $selectedNetwork?.id === networkId
	);

export const mapToSignerBitcoinNetwork = ({
	network
}: {
	network: BitcoinNetwork;
}): SignerBitcoinNetwork =>
	({ mainnet: { mainnet: null }, testnet: { testnet: null }, regtest: { regtest: null } })[network];

export const findNetworkById = <T extends Network = Network>({
	networks,
	id
}: {
	networks: T[];
	id: NetworkId;
}): T | undefined => networks.find(({ id: networkId }) => networkId === id);
