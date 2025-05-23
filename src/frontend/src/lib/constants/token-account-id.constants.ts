import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_BITCOIN_NETWORKS } from '$env/networks/networks.btc.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_NETWORKS } from '$env/networks/networks.sol.env';
import type { Network } from '$lib/types/network';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';

export const TOKEN_ACCOUNT_ID_TO_NETWORKS: { [key in TokenAccountIdTypes]: Network[] } = {
	Icrcv2: [ICP_NETWORK],
	Btc: SUPPORTED_BITCOIN_NETWORKS,
	Eth: [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS],
	Sol: SUPPORTED_SOLANA_NETWORKS
};
