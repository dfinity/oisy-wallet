import { ETHEREUM_NETWORK } from '$eth/constants/networks.constants';
import {
	ICP_INDEX_CANISTER_ID,
	ICP_LEDGER_CANISTER_ID,
	ICP_TRANSACTION_FEE_E8S
} from '$icp/constants/icp.constants';
import { ICP_NETWORK } from '$icp/constants/networks.constants';
import type { IcToken } from '$icp/types/ic';
import eth from '$lib/assets/eth.svg';
import icpLight from '$lib/assets/icp_light.svg';
import type { Token } from '$lib/types/token';

/**
 * Ethereum
 */
export const ETHEREUM_SYMBOL = import.meta.env.VITE_ETHEREUM_SYMBOL;

export const ETHEREUM_TOKEN_ID = Symbol(ETHEREUM_SYMBOL);

export const ETHEREUM_TOKEN: Required<Token> = {
	id: ETHEREUM_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'ethereum',
	name: 'Ethereum',
	symbol: ETHEREUM_SYMBOL,
	decimals: 18,
	icon: eth
};

/**
 * ICP
 */
export const ICP_SYMBOL = 'ICP';

export const ICP_TOKEN_ID = Symbol(ICP_SYMBOL);

export const ICP_TOKEN: Required<IcToken> = {
	id: ICP_TOKEN_ID,
	network: ICP_NETWORK,
	standard: 'icp',
	exchangeCoinId: 'internet-computer',
	name: 'ICP',
	symbol: ICP_SYMBOL,
	decimals: 8,
	icon: icpLight,
	fee: ICP_TRANSACTION_FEE_E8S,
	ledgerCanisterId: ICP_LEDGER_CANISTER_ID,
	indexCanisterId: ICP_INDEX_CANISTER_ID
};
