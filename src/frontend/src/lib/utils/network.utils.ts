import type { BitcoinNetwork as SignerBitcoinNetwork } from '$declarations/signer/signer.did';
import { SUPPORTED_ARBITRUM_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { SUPPORTED_BASE_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.base.env';
import { SUPPORTED_BSC_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { SUPPORTED_EVM_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_POLYGON_NETWORK_IDS } from '$env/networks/networks-evm/networks.evm.polygon.env';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID,
	SUPPORTED_BITCOIN_NETWORK_IDS
} from '$env/networks/networks.btc.env';
import { SEPOLIA_NETWORK_ID, SUPPORTED_ETHEREUM_NETWORK_IDS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID, ICP_PSEUDO_TESTNET_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	SOLANA_DEVNET_NETWORK_ID,
	SOLANA_LOCAL_NETWORK_ID,
	SOLANA_MAINNET_NETWORK_ID,
	SUPPORTED_SOLANA_NETWORK_IDS
} from '$env/networks/networks.sol.env';
import { isTokenIcTestnet } from '$icp/utils/ic-ledger.utils';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { SolanaNetwork } from '$sol/types/network';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { nonNullish } from '@dfinity/utils';

export type IsNetworkIdUtil = (networkId: NetworkId | undefined) => boolean;

export const isNetworkICP = (network: Network | undefined): boolean => isNetworkIdICP(network?.id);

export const isNetworkSolana = (network: Network | undefined): network is SolanaNetwork =>
	isNetworkIdSolana(network?.id);

export const isPseudoNetworkIdIcpTestnet: IsNetworkIdUtil = (id) =>
	nonNullish(id) && id === ICP_PSEUDO_TESTNET_NETWORK_ID;

export const isNetworkIdICP: IsNetworkIdUtil = (id) =>
	(nonNullish(id) && ICP_NETWORK_ID === id) || isPseudoNetworkIdIcpTestnet(id);

export const isNetworkIdEthereum: IsNetworkIdUtil = (id) =>
	nonNullish(id) && SUPPORTED_ETHEREUM_NETWORK_IDS.includes(id);

export const isNetworkIdEvm: IsNetworkIdUtil = (id) =>
	nonNullish(id) && SUPPORTED_EVM_NETWORK_IDS.includes(id);

export const isNetworkIdBase: IsNetworkIdUtil = (id) =>
	nonNullish(id) && SUPPORTED_BASE_NETWORK_IDS.includes(id);

export const isNetworkIdBsc: IsNetworkIdUtil = (id) =>
	nonNullish(id) && SUPPORTED_BSC_NETWORK_IDS.includes(id);

export const isNetworkIdPolygon: IsNetworkIdUtil = (id) =>
	nonNullish(id) && SUPPORTED_POLYGON_NETWORK_IDS.includes(id);

export const isNetworkIdArbitrum: IsNetworkIdUtil = (id) =>
	nonNullish(id) && SUPPORTED_ARBITRUM_NETWORK_IDS.includes(id);

export const isNetworkIdBitcoin: IsNetworkIdUtil = (id) =>
	nonNullish(id) && SUPPORTED_BITCOIN_NETWORK_IDS.includes(id);

export const isNetworkIdBTCMainnet: IsNetworkIdUtil = (networkId) =>
	BTC_MAINNET_NETWORK_ID === networkId;

export const isNetworkIdBTCTestnet: IsNetworkIdUtil = (networkId) =>
	BTC_TESTNET_NETWORK_ID === networkId;

export const isNetworkIdBTCRegtest: IsNetworkIdUtil = (networkId) =>
	BTC_REGTEST_NETWORK_ID === networkId;

export const isNetworkIdSepolia: IsNetworkIdUtil = (networkId) => SEPOLIA_NETWORK_ID === networkId;

export const isNetworkIdSolana: IsNetworkIdUtil = (networkId) =>
	nonNullish(networkId) && SUPPORTED_SOLANA_NETWORK_IDS.includes(networkId);

export const isNetworkIdSOLMainnet: IsNetworkIdUtil = (networkId) =>
	SOLANA_MAINNET_NETWORK_ID === networkId;

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

export const mapBitcoinNetworkToNetworkId = (network: BitcoinNetwork): NetworkId | undefined => {
	const reverseMapper: Record<BitcoinNetwork, NetworkId> = {
		mainnet: BTC_MAINNET_NETWORK_ID,
		testnet: BTC_TESTNET_NETWORK_ID,
		regtest: BTC_REGTEST_NETWORK_ID
	};
	return reverseMapper[network];
};

export const showTokenFilteredBySelectedNetwork = ({
	token,
	$selectedNetwork,
	$pseudoNetworkChainFusion
}: {
	token: Token;
	$selectedNetwork: Network | undefined;
	$pseudoNetworkChainFusion: boolean;
}): boolean =>
	($pseudoNetworkChainFusion && !isTokenIcTestnet(token) && token.network.env !== 'testnet') ||
	$selectedNetwork?.id === token.network.id;

export const showTokenFilteredBySelectedNetworks = ({
	token,
	$selectedNetworks,
	$pseudoNetworkChainFusion
}: {
	token: Token;
	$selectedNetworks: NetworkId[] | undefined;
	$pseudoNetworkChainFusion: boolean;
}): boolean =>
	($pseudoNetworkChainFusion && !isTokenIcTestnet(token) && token.network.env !== 'testnet') ||
	(nonNullish($selectedNetworks) && $selectedNetworks?.includes(token.network.id));

/**
 * Filter the tokens that either lives on the selected network or, if no network is provided, pseud Chain Fusion, then those that are not testnets.
 */
export const filterTokensForSelectedNetwork = <T extends Token>([
	$tokens,
	$selectedNetwork,
	$pseudoNetworkChainFusion
]: [T[], Network | undefined, boolean]): T[] =>
	$tokens.filter((token) =>
		showTokenFilteredBySelectedNetwork({ token, $selectedNetwork, $pseudoNetworkChainFusion })
	);

export const filterTokensForSelectedNetworks = <T extends Token>([
	$tokens,
	$selectedNetworks,
	$pseudoNetworkChainFusion
]: [T[], NetworkId[] | undefined, boolean]): T[] =>
	$tokens.filter((token) =>
		showTokenFilteredBySelectedNetworks({ token, $selectedNetworks, $pseudoNetworkChainFusion })
	);

export const mapToSignerBitcoinNetwork = ({
	network
}: {
	network: BitcoinNetwork;
}): SignerBitcoinNetwork =>
	({ mainnet: { mainnet: null }, testnet: { testnet: null }, regtest: { regtest: null } })[network];
