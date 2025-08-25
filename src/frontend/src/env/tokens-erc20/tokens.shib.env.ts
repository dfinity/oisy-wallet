import { ETHEREUM_NETWORK } from '$env/networks.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import shib from '$icp-eth/assets/shib.svg';

export const SHIB_DECIMALS = 18;

export const SHIB_SYMBOL = 'SHIB';

export const SHIB_TOKEN_ID: unique symbol = Symbol(SHIB_SYMBOL);

export const SHIB_TOKEN: RequiredErc20Token = {
	id: SHIB_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'SHIBA INU',
	symbol: 'SHIB',
	decimals: SHIB_DECIMALS,
	icon: shib,
	address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
	exchange: 'erc20',
	twinTokenSymbol: 'ckSHIB'
};
