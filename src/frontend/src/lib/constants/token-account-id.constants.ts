import { SUPPORTED_EVM_MAINNET_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_BITCOIN_MAINNET_NETWORKS } from '$env/networks/networks.btc.env';
import { SUPPORTED_ETHEREUM_MAINNET_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_MAINNET_NETWORKS } from '$env/networks/networks.sol.env';
import type { Network } from '$lib/types/network';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import type { NonEmptyArray } from '$lib/types/utils';

export const TOKEN_ACCOUNT_ID_TO_NETWORKS: { [key in TokenAccountIdTypes]: Network[] } = {
	Icrcv2: [ICP_NETWORK],
	Btc: SUPPORTED_BITCOIN_MAINNET_NETWORKS,
	Eth: [...SUPPORTED_ETHEREUM_MAINNET_NETWORKS, ...SUPPORTED_EVM_MAINNET_NETWORKS],
	Sol: SUPPORTED_SOLANA_MAINNET_NETWORKS
};

// The type definition '[key in TokenAccountIdType]' of TOKEN_ACCOUNT_ID_TO_NETWORKS ensures
// that this array contains all possible values of TokenAccountIdType
export const TOKEN_ACCOUNT_ID_TYPES = Object.keys(
	TOKEN_ACCOUNT_ID_TO_NETWORKS
) as NonEmptyArray<TokenAccountIdTypes>;

export const TOKEN_ACCOUNT_ID_TYPES_SORT_ORDER: { [key in TokenAccountIdTypes]: number } = {
	Btc: 1,
	Eth: 2,
	Icrcv2: 3,
	Sol: 4
};

export const TOKEN_ACCOUNT_ID_TYPES_CASE_SENSITIVE: { [key in TokenAccountIdTypes]: boolean } = {
	Btc: false,
	Eth: false,
	Icrcv2: false,
	// Solana is case-sensitive for the addresses
	Sol: true
};
