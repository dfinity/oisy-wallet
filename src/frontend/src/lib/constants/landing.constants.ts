import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ROBINHOOD_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { XRP_MAINNET_NETWORK } from '$env/networks/networks.xrp.env';
import type { Network } from '$lib/types/network';

// Brand order: Bitcoin, Ethereum and the Internet Computer first, the rest alphabetical.
export const LANDING_NETWORKS: Network[] = [
	BTC_MAINNET_NETWORK,
	ETHEREUM_NETWORK,
	ICP_NETWORK,
	ARBITRUM_MAINNET_NETWORK,
	BASE_NETWORK,
	BSC_MAINNET_NETWORK,
	POLYGON_MAINNET_NETWORK,
	ROBINHOOD_MAINNET_NETWORK,
	SOLANA_MAINNET_NETWORK,
	XRP_MAINNET_NETWORK
];
