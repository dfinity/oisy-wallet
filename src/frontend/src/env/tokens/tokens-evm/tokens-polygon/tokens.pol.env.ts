import {
	POLYGON_AMOY_NETWORK,
	POLYGON_MAINNET_ENABLED,
	POLYGON_MAINNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.polygon.env';
import pol from '$evm/polygon/assets/pol.svg';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';

const POL_DECIMALS = 18;

const POL_MAINNET_SYMBOL = 'POL';

export const POL_MAINNET_TOKEN_ID: TokenId = parseTokenId(POL_MAINNET_SYMBOL);

export const POL_MAINNET_TOKEN: RequiredToken = {
	id: POL_MAINNET_TOKEN_ID,
	network: POLYGON_MAINNET_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'POL (prev. MATIC)',
	symbol: POL_MAINNET_SYMBOL,
	decimals: POL_DECIMALS,
	icon: pol,
	buy: {
		onramperId: 'pol_polygon'
	}
};

const POL_AMOY_SYMBOL = 'POL (Amoy Testnet)';

export const POL_AMOY_TOKEN_ID: TokenId = parseTokenId(POL_AMOY_SYMBOL);

export const POL_AMOY_TOKEN: RequiredToken = {
	id: POL_AMOY_TOKEN_ID,
	network: POLYGON_AMOY_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'POL (Amoy Testnet)',
	symbol: POL_AMOY_SYMBOL,
	decimals: POL_DECIMALS,
	icon: pol
};

export const SUPPORTED_POLYGON_TOKENS: RequiredToken[] = defineSupportedTokens({
	mainnetFlag: POLYGON_MAINNET_ENABLED,
	mainnetTokens: [POL_MAINNET_TOKEN],
	testnetTokens: [POL_AMOY_TOKEN]
});
