import {
	BSC_MAINNET_ENABLED,
	BSC_MAINNET_NETWORK,
	BSC_TESTNET_NETWORK
} from '$env/networks/networks-evm/networks.evm.bsc.env';
import bnb from '$evm/bsc/assets/bnb.svg';
import type { RequiredToken, TokenId } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';

const BNB_DECIMALS = 18;

const BNB_MAINNET_SYMBOL = 'BNB';

export const BNB_MAINNET_TOKEN_ID: TokenId = parseTokenId(BNB_MAINNET_SYMBOL);

export const BNB_MAINNET_TOKEN: RequiredToken = {
	id: BNB_MAINNET_TOKEN_ID,
	network: BSC_MAINNET_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'BNB',
	symbol: BNB_MAINNET_SYMBOL,
	decimals: BNB_DECIMALS,
	icon: bnb,
	buy: {
		onramperId: 'bnb_bsc'
	}
};

const BNB_TESTNET_SYMBOL = 'BNB (Testnet)';

export const BNB_TESTNET_TOKEN_ID: TokenId = parseTokenId(BNB_TESTNET_SYMBOL);

export const BNB_TESTNET_TOKEN: RequiredToken = {
	id: BNB_TESTNET_TOKEN_ID,
	network: BSC_TESTNET_NETWORK,
	standard: 'ethereum',
	category: 'default',
	name: 'BNB (Testnet)',
	symbol: BNB_TESTNET_SYMBOL,
	decimals: BNB_DECIMALS,
	icon: bnb
};

export const SUPPORTED_BSC_TOKENS: RequiredToken[] = defineSupportedTokens({
	mainnetFlag: BSC_MAINNET_ENABLED,
	mainnetTokens: [BNB_MAINNET_TOKEN],
	testnetTokens: [BNB_TESTNET_TOKEN]
});
