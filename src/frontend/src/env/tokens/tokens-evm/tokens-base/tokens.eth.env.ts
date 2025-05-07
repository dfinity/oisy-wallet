import {
	BASE_MAINNET_ENABLED,
	BASE_NETWORK,
	BASE_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.base.env';
import { ETH_TOKEN_GROUP } from '$env/tokens/groups/groups.eth.env';
import eth from '$icp-eth/assets/eth.svg';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';

const BASE_ETH_DECIMALS = 18;

const BASE_ETH_SYMBOL = 'ETH';

export const BASE_ETH_TOKEN_ID: TokenId = parseTokenId(BASE_ETH_SYMBOL);

export const BASE_ETH_TOKEN: RequiredToken = {
	id: BASE_ETH_TOKEN_ID,
	network: BASE_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'Ethereum',
	symbol: BASE_ETH_SYMBOL,
	decimals: BASE_ETH_DECIMALS,
	icon: eth,
	groupData: ETH_TOKEN_GROUP,
	buy: {
		onramperId: 'eth_base'
	}
};

const BASE_SEPOLIA_ETH_SYMBOL = 'SepoliaETH';

export const BASE_SEPOLIA_ETH_TOKEN_ID: TokenId = parseTokenId(BASE_SEPOLIA_ETH_SYMBOL);

export const BASE_SEPOLIA_ETH_TOKEN: RequiredToken = {
	id: BASE_SEPOLIA_ETH_TOKEN_ID,
	network: BASE_SEPOLIA_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'SepoliaETH',
	symbol: BASE_SEPOLIA_ETH_SYMBOL,
	decimals: BASE_ETH_DECIMALS,
	icon: eth
};

export const SUPPORTED_BASE_TOKENS: RequiredToken[] = defineSupportedTokens({
	mainnetFlag: BASE_MAINNET_ENABLED,
	mainnetTokens: [BASE_ETH_TOKEN],
	testnetTokens: [BASE_SEPOLIA_ETH_TOKEN]
});
