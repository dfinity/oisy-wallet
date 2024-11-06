import { ICP_NETWORK } from '$env/networks.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const $tokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];

export const validToken: Token = {
	id: parseTokenId('TokenId'),
	network: ICP_NETWORK,
	standard: 'icp',
	category: 'default',
	name: 'SampleToken',
	symbol: 'STK',
	decimals: 8
};
