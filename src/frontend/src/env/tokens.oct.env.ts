import { ETHEREUM_NETWORK } from '$env/networks.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import oct from '$icp-eth/assets/oct.svg';

export const OCT_DECIMALS = 18;

export const OCT_SYMBOL = 'OCT';

export const OCT_TOKEN_ID: unique symbol = Symbol(OCT_SYMBOL);

export const OCT_TOKEN: RequiredErc20Token = {
	id: OCT_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Octopus Network Token',
	symbol: OCT_SYMBOL,
	decimals: OCT_DECIMALS,
	icon: oct,
	address: '0xF5cFBC74057C610c8EF151A439252680AC68c6DC',
	exchange: 'erc20',
	twinTokenSymbol: 'ckOCT'
};
