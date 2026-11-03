import {
	ROBINHOOD_MAINNET_ENABLED,
	ROBINHOOD_MAINNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { ETH_TOKEN_GROUP } from '$env/tokens/groups/groups.eth.env';
import eth from '$icp-eth/assets/eth.svg';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';

const ROBINHOOD_ETH_DECIMALS = 18;

const ROBINHOOD_ETH_SYMBOL = 'ETH';

// `parseTokenId` yields a distinct id from Base's and Arbitrum's ETH despite the identical symbol
// string, which is why the price map needs its own entry for this token.
export const ROBINHOOD_ETH_TOKEN_ID: TokenId = parseTokenId(ROBINHOOD_ETH_SYMBOL);

export const ROBINHOOD_ETH_TOKEN: RequiredToken = {
	id: ROBINHOOD_ETH_TOKEN_ID,
	network: ROBINHOOD_MAINNET_NETWORK,
	standard: { code: 'ethereum' },
	category: 'default',
	tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }],
	name: 'Ethereum',
	symbol: ROBINHOOD_ETH_SYMBOL,
	decimals: ROBINHOOD_ETH_DECIMALS,
	icon: eth,
	groupData: ETH_TOKEN_GROUP,
	buy: {
		onramperId: 'eth_robinhood'
	}
};

export const SUPPORTED_ROBINHOOD_TOKENS: RequiredToken[] = defineSupportedTokens({
	mainnetFlag: ROBINHOOD_MAINNET_ENABLED,
	mainnetTokens: [ROBINHOOD_ETH_TOKEN]
});
