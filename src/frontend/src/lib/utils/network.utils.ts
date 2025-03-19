import type { BitcoinNetwork as SignerBitcoinNetwork } from '$declarations/signer/signer.did';
import { SUPPORTED_BITCOIN_NETWORKS_IDS } from '$env/networks/networks.btc.env';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID,
	ICP_NETWORK_ID,
	SEPOLIA_NETWORK_ID,
	SUPPORTED_ETHEREUM_NETWORKS_IDS
} from '$env/networks/networks.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID,
	SOLANA_TESTNET_NETWORK_ID,
	SUPPORTED_SOLANA_NETWORKS_IDS
} from '$env/networks/networks.sol.env';
import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { SolanaNetwork } from '$sol/types/network';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { nonNullish } from '@dfinity/utils';

export type IsNetworkIdUtil = (networkId: NetworkId | undefined) => boolean;

export const isNetworkICP = (network: Network | undefined): boolean => isNetworkIdICP(network?.id);

export const isNetworkSolana = (network: Network | undefined): network is SolanaNetwork =>
	isNetworkIdSolana(network?.id);

export const isNetworkIdICP: IsNetworkIdUtil = (id) => nonNullish(id) && ICP_NETWORK_ID === id;

export const isNetworkIdEthereum: IsNetworkIdUtil = (id) =>
	nonNullish(id) && SUPPORTED_ETHEREUM_NETWORKS_IDS.includes(id);

export const isNetworkIdBitcoin: IsNetworkIdUtil = (id) =>
	nonNullish(id) && SUPPORTED_BITCOIN_NETWORKS_IDS.includes(id);

export const isNetworkIdBTCMainnet: IsNetworkIdUtil = (networkId) =>
	BTC_MAINNET_NETWORK_ID === networkId;

export const isNetworkIdBTCTestnet: IsNetworkIdUtil = (networkId) =>
	BTC_TESTNET_NETWORK_ID === networkId;

export const isNetworkIdBTCRegtest: IsNetworkIdUtil = (networkId) =>
	BTC_REGTEST_NETWORK_ID === networkId;

export const isNetworkIdSepolia: IsNetworkIdUtil = (networkId) => SEPOLIA_NETWORK_ID === networkId;

export const isNetworkIdSolana: IsNetworkIdUtil = (networkId) =>
	nonNullish(networkId) && SUPPORTED_SOLANA_NETWORKS_IDS.includes(networkId);

export const isNetworkIdSOLMainnet: IsNetworkIdUtil = (networkId) =>
	SOLANA_MAINNET_NETWORK_ID === networkId;

export const isNetworkIdSOLTestnet: IsNetworkIdUtil = (networkId) =>
	SOLANA_TESTNET_NETWORK_ID === networkId;

export const isNetworkIdSOLDevnet: IsNetworkIdUtil = (networkId) =>
	SOLANA_DEVNET_NETWORK_ID === networkId;

export const isNetworkIdSOLLocal: IsNetworkIdUtil = (networkId) =>
	SOLANA_LOCAL_NETWORK_ID === networkId;

const mapper: Record<symbol, BitcoinNetwork> = {
	[BTC_MAINNET_NETWORK_ID]: 'mainnet',
	[BTC_TESTNET_NETWORK_ID]: 'testnet',
	[BTC_REGTEST_NETWORK_ID]: 'regtest'
};

export const mapNetworkIdToBitcoinNetwork = (networkId: NetworkId): BitcoinNetwork | undefined =>
	mapper[networkId];

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

export const mapToSignerBitcoinNetwork = ({
	network
}: {
	network: BitcoinNetwork;
}): SignerBitcoinNetwork =>
	({ mainnet: { mainnet: null }, testnet: { testnet: null }, regtest: { regtest: null } })[network];
