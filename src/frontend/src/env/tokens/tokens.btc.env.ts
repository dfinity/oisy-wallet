import bitcoinTestnet from '$btc/assets/bitcoin-testnet.svg';
import bitcoin from '$btc/assets/bitcoin.svg';
import {
	BTC_MAINNET_ENABLED,
	BTC_MAINNET_NETWORK,
	BTC_REGTEST_NETWORK,
	BTC_TESTNET_NETWORK
} from '$env/networks/networks.btc.env';
import { BTC_TOKEN_GROUP } from '$env/tokens/groups/groups.btc.env';
import type { Token, TokenId, TokenWithLinkedData } from '$lib/types/token';
import { defineSupportedTokens } from '$lib/utils/env.tokens.utils';
import { parseTokenId } from '$lib/validation/token.validation';

export const BTC_DECIMALS = 8;

export const BTC_MAINNET_SYMBOL = 'BTC';

export const BTC_MAINNET_TOKEN_ID: TokenId = parseTokenId(BTC_MAINNET_SYMBOL);

export const BTC_MAINNET_TOKEN: TokenWithLinkedData = {
	id: BTC_MAINNET_TOKEN_ID,
	network: BTC_MAINNET_NETWORK,
	standard: 'bitcoin',
	category: 'default',
	name: 'Bitcoin',
	symbol: BTC_MAINNET_SYMBOL,
	decimals: BTC_DECIMALS,
	icon: bitcoin,
	twinTokenSymbol: 'ckBTC',
	groupData: BTC_TOKEN_GROUP,
	alwaysShowInTokenGroup: true,
	buy: { onramperId: 'btc' }
};

export const BTC_TESTNET_SYMBOL = 'BTC (Testnet)';

export const BTC_TESTNET_TOKEN_ID: TokenId = parseTokenId(BTC_TESTNET_SYMBOL);

export const BTC_TESTNET_TOKEN: Token = {
	id: BTC_TESTNET_TOKEN_ID,
	network: BTC_TESTNET_NETWORK,
	standard: 'bitcoin',
	category: 'default',
	name: 'Bitcoin (Testnet)',
	symbol: BTC_TESTNET_SYMBOL,
	decimals: BTC_DECIMALS,
	icon: bitcoinTestnet
};

export const BTC_REGTEST_SYMBOL = 'BTC (Regtest)';

export const BTC_REGTEST_TOKEN_ID: TokenId = parseTokenId(BTC_REGTEST_SYMBOL);

export const BTC_REGTEST_TOKEN: Token = {
	id: BTC_REGTEST_TOKEN_ID,
	network: BTC_REGTEST_NETWORK,
	standard: 'bitcoin',
	category: 'default',
	name: 'Bitcoin (Regtest)',
	symbol: BTC_REGTEST_SYMBOL,
	decimals: BTC_DECIMALS,
	icon: bitcoinTestnet
};

// The following tokens are used as fallback for any Bitcoin token defined in the token store.
// That means that the order of the tokens in the array is important, to have a correct fallback chain.
export const SUPPORTED_BITCOIN_TOKENS: Token[] = defineSupportedTokens({
	mainnetFlag: BTC_MAINNET_ENABLED,
	mainnetTokens: [BTC_MAINNET_TOKEN],
	testnetTokens: [BTC_TESTNET_TOKEN],
	localTokens: [BTC_REGTEST_TOKEN]
});
