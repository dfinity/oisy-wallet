import { ICP_EXPLORER_URL } from '$env/explorers.env';
import { ETHEREUM_NETWORK, ICP_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import { ETH_MAINNET_ENABLED } from '$env/networks.eth.env';
import { ICP_INDEX_CANISTER_ID, ICP_LEDGER_CANISTER_ID } from '$env/networks.icp.env';
import eth from '$icp-eth/assets/eth.svg';
import icpLight from '$icp/assets/icp_light.svg';
import { ICP_TRANSACTION_FEE_E8S } from '$icp/constants/icp.constants';
import type { IcToken } from '$icp/types/ic-token';
import type { RequiredToken, RequiredTokenWithLinkedData, TokenId } from '$lib/types/token';

import { parseTokenId } from '$lib/validation/token.validation';

/**
 * Ethereum
 */
export const ETHEREUM_DEFAULT_DECIMALS = 18;

const ETHEREUM_SYMBOL = 'ETH';

export const ETHEREUM_TOKEN_ID: TokenId = parseTokenId(ETHEREUM_SYMBOL);

export const ETHEREUM_TOKEN: RequiredTokenWithLinkedData = {
	id: ETHEREUM_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'Ethereum',
	symbol: ETHEREUM_SYMBOL,
	decimals: ETHEREUM_DEFAULT_DECIMALS,
	icon: eth,
	twinTokenSymbol: 'ckETH',
	buy: {
		onramperId: 'eth'
	}
};

export const SEPOLIA_SYMBOL = 'SepoliaETH';

export const SEPOLIA_TOKEN_ID: TokenId = parseTokenId(SEPOLIA_SYMBOL);

export const SEPOLIA_TOKEN: RequiredTokenWithLinkedData = {
	id: SEPOLIA_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'SepoliaETH',
	symbol: SEPOLIA_SYMBOL,
	decimals: ETHEREUM_DEFAULT_DECIMALS,
	icon: eth,
	twinTokenSymbol: 'ckSepoliaETH'
};

/**
 * The tokens store is useful for enabling and disabling features based on the testnets flag. However, constants are handy and not too verbose for testing if a token ID belongs to an Ethereum token.
 *
 */
export const SUPPORTED_ETHEREUM_TOKENS: [
	...RequiredTokenWithLinkedData[],
	RequiredTokenWithLinkedData
] = [...(ETH_MAINNET_ENABLED ? [ETHEREUM_TOKEN] : []), SEPOLIA_TOKEN];

export const SUPPORTED_ETHEREUM_TOKEN_IDS: symbol[] = SUPPORTED_ETHEREUM_TOKENS.map(({ id }) => id);

/**
 * ICP
 */
export const ICP_SYMBOL = 'ICP';

export const ICP_TOKEN_ID: TokenId = parseTokenId(ICP_SYMBOL);

export const ICP_TOKEN: RequiredToken<IcToken> = {
	id: ICP_TOKEN_ID,
	network: ICP_NETWORK,
	standard: 'icp',
	category: 'default',
	exchangeCoinId: 'internet-computer',
	position: 0,
	name: 'Internet Computer',
	symbol: ICP_SYMBOL,
	decimals: 8,
	icon: icpLight,
	fee: ICP_TRANSACTION_FEE_E8S,
	ledgerCanisterId: ICP_LEDGER_CANISTER_ID,
	indexCanisterId: ICP_INDEX_CANISTER_ID,
	explorerUrl: ICP_EXPLORER_URL,
	buy: {
		onramperId: 'icp_icp'
	}
};
