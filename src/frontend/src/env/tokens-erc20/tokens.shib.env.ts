import { ETHEREUM_NETWORK } from '$env/networks.env';
import type { EnvTokenErc20 } from '$env/types/env-token-erc20';
import shib from '$icp-eth/assets/shib.svg';

export const SHIB_DECIMALS = 18;

export const SHIB_SYMBOL = 'SHIB';

export const SHIB_TOKEN_ID: unique symbol = Symbol(SHIB_SYMBOL);

export const SHIB_TOKEN: EnvTokenErc20 = {
	id: SHIB_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'SHIBA INU',
	symbol: 'SHIB',
	decimals: SHIB_DECIMALS,
	icon: shib,
	exchange: 'erc20',
	twinTokenSymbol: 'ckSHIB'
};
