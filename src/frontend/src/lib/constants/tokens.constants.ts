import { BTC_MAINNET_ENABLED } from '$env/networks/networks.btc.env';
import {
	BTC_MAINNET_TOKEN,
	BTC_REGTEST_TOKEN,
	BTC_TESTNET_TOKEN
} from '$env/tokens/tokens.btc.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import type { Token } from '$lib/types/token';

export const [DEFAULT_ETHEREUM_TOKEN] = SUPPORTED_ETHEREUM_TOKENS;

// The following tokens are used as fallback for any Bitcoin token defined in the token store.
// That means that the order of the tokens in the array is important, to have a correct fallback chain.
export const SUPPORTED_BITCOIN_TOKENS: [...Token[], Token] = [
	...(BTC_MAINNET_ENABLED ? [BTC_MAINNET_TOKEN] : []),
	BTC_TESTNET_TOKEN,
	BTC_REGTEST_TOKEN
];

export const [DEFAULT_BITCOIN_TOKEN, _] = SUPPORTED_BITCOIN_TOKENS;
