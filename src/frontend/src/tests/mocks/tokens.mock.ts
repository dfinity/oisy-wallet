import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { Token } from '$lib/types/token';
import { parseTokenId } from '$lib/validation/token.validation';

export const mockTokens: Token[] = [ICP_TOKEN, BTC_MAINNET_TOKEN, ETHEREUM_TOKEN];

export const mockValidToken: Token = {
	id: parseTokenId('TokenId'),
	network: ICP_NETWORK,
	standard: 'icp',
	category: 'default',
	name: 'SampleToken',
	symbol: 'STK',
	decimals: 8
};
