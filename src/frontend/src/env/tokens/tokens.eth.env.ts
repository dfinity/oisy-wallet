import {
	ETH_MAINNET_ENABLED,
	ETHEREUM_NETWORK,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import { ETH_TOKEN_GROUP } from '$env/tokens/groups/groups.eth.env';
import eth from '$icp-eth/assets/eth.svg';
import type { RequiredTokenWithLinkedData, TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';

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
	groupData: ETH_TOKEN_GROUP,
	alwaysShowInTokenGroup: true,
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
export const SUPPORTED_ETHEREUM_TOKENS: RequiredTokenWithLinkedData[] = defineSupportedTokens({
	mainnetFlag: ETH_MAINNET_ENABLED,
	mainnetTokens: [ETHEREUM_TOKEN],
	testnetTokens: [SEPOLIA_TOKEN]
});

export const SUPPORTED_ETHEREUM_TOKEN_IDS: TokenId[] = SUPPORTED_ETHEREUM_TOKENS.map(
	({ id }) => id
);
