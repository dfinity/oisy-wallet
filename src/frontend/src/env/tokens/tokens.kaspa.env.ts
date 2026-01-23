import kaspa from '$kaspa/assets/kaspa.svg';
import {
	KASPA_MAINNET_ENABLED,
	KASPA_MAINNET_NETWORK,
	KASPA_TESTNET_NETWORK
} from '$env/networks/networks.kaspa.env';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';

// Kaspa uses 8 decimal places (1 KAS = 100,000,000 sompi)
export const KASPA_DECIMALS = 8;

export const KASPA_MAINNET_SYMBOL = 'KAS';

export const KASPA_MAINNET_TOKEN_ID: TokenId = parseTokenId(KASPA_MAINNET_SYMBOL);

export const KASPA_MAINNET_TOKEN: RequiredToken = {
	id: KASPA_MAINNET_TOKEN_ID,
	network: KASPA_MAINNET_NETWORK,
	standard: { code: 'kaspa' },
	category: 'default',
	name: 'Kaspa',
	symbol: KASPA_MAINNET_SYMBOL,
	decimals: KASPA_DECIMALS,
	icon: kaspa
};

export const KASPA_TESTNET_SYMBOL = 'KAS (Testnet)';

export const KASPA_TESTNET_TOKEN_ID: TokenId = parseTokenId(KASPA_TESTNET_SYMBOL);

export const KASPA_TESTNET_TOKEN: RequiredToken = {
	id: KASPA_TESTNET_TOKEN_ID,
	network: KASPA_TESTNET_NETWORK,
	standard: { code: 'kaspa' },
	category: 'default',
	name: 'Kaspa (Testnet)',
	symbol: KASPA_TESTNET_SYMBOL,
	decimals: KASPA_DECIMALS,
	icon: kaspa
};

export const SUPPORTED_KASPA_TOKENS: RequiredToken[] = defineSupportedTokens({
	mainnetFlag: KASPA_MAINNET_ENABLED,
	mainnetTokens: [KASPA_MAINNET_TOKEN],
	testnetTokens: [KASPA_TESTNET_TOKEN]
});
