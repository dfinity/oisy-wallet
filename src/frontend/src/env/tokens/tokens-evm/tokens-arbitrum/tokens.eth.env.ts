import {
	ARBITRUM_MAINNET_ENABLED,
	ARBITRUM_MAINNET_NETWORK,
	ARBITRUM_SEPOLIA_NETWORK
} from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { ETH_TOKEN_GROUP } from '$env/tokens/groups/groups.eth.env';
import eth from '$icp-eth/assets/eth.svg';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';

const ARBITRUM_ETH_DECIMALS = 18;

const ARBITRUM_ETH_SYMBOL = 'ETH';

export const ARBITRUM_ETH_TOKEN_ID: TokenId = parseTokenId(ARBITRUM_ETH_SYMBOL);

export const ARBITRUM_ETH_TOKEN: RequiredToken = {
	id: ARBITRUM_ETH_TOKEN_ID,
	network: ARBITRUM_MAINNET_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'Ethereum',
	symbol: ARBITRUM_ETH_SYMBOL,
	decimals: ARBITRUM_ETH_DECIMALS,
	icon: eth,
	groupData: ETH_TOKEN_GROUP,
	buy: {
		onramperId: 'eth_arbitrum'
	}
};

const ARBITRUM_SEPOLIA_ETH_SYMBOL = 'SepoliaETH';

export const ARBITRUM_SEPOLIA_ETH_TOKEN_ID: TokenId = parseTokenId(ARBITRUM_SEPOLIA_ETH_SYMBOL);

export const ARBITRUM_SEPOLIA_ETH_TOKEN: RequiredToken = {
	id: ARBITRUM_SEPOLIA_ETH_TOKEN_ID,
	network: ARBITRUM_SEPOLIA_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'SepoliaETH',
	symbol: ARBITRUM_SEPOLIA_ETH_SYMBOL,
	decimals: ARBITRUM_ETH_DECIMALS,
	icon: eth
};

export const SUPPORTED_ARBITRUM_TOKENS: RequiredToken[] = defineSupportedTokens({
	mainnetFlag: ARBITRUM_MAINNET_ENABLED,
	mainnetTokens: [ARBITRUM_ETH_TOKEN],
	testnetTokens: [ARBITRUM_SEPOLIA_ETH_TOKEN]
});
