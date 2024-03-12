import { ETH_MAINNET_ENABLED } from '$eth/constants/networks.constants';
import eth from '$icp-eth/assets/eth.svg';
import {
	ETHEREUM_NETWORK,
	ICP_NETWORK,
	SEPOLIA_NETWORK
} from '$icp-eth/constants/networks.constants';
import icpLight from '$icp/assets/icp_light.svg';
import {
	ICP_INDEX_CANISTER_ID,
	ICP_LEDGER_CANISTER_ID,
	ICP_TRANSACTION_FEE_E8S
} from '$icp/constants/icp.constants';
import type { IcToken } from '$icp/types/ic';
import type { Token } from '$lib/types/token';

/**
 * Ethereum
 */
const ETHEREUM_SYMBOL = 'ETH';

export const ETHEREUM_TOKEN_ID: unique symbol = Symbol(ETHEREUM_SYMBOL);

export const ETHEREUM_TOKEN: Required<Token> = {
	id: ETHEREUM_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'ethereum',
	name: 'Ethereum',
	symbol: 'ETH',
	decimals: 18,
	icon: eth
};

export const SEPOLIA_SYMBOL = 'SepoliaETH';

export const SEPOLIA_TOKEN_ID: unique symbol = Symbol(SEPOLIA_SYMBOL);

export const SEPOLIA_TOKEN: Required<Token> = {
	id: SEPOLIA_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'ethereum',
	name: 'SepoliaETH',
	symbol: 'SepoliaETH',
	decimals: 18,
	icon: eth
};

export const ETHEREUM_TOKENS: [...Required<Token>[], Required<Token>] = [
	...(ETH_MAINNET_ENABLED ? [ETHEREUM_TOKEN] : []),
	SEPOLIA_TOKEN
];

export const ETHEREUM_TOKEN_IDS: symbol[] = ETHEREUM_TOKENS.map(({ id }) => id);

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
