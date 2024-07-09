import { ETHEREUM_NETWORK } from '$env/networks.env';
import { ckErc20Production } from '$env/tokens.ckerc20.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import shib from '$icp-eth/assets/shib.svg';

export const SHIB_DECIMALS = 18;

export const SHIB_SYMBOL = 'SHIB';

export const SHIB_TOKEN_ID: unique symbol = Symbol(SHIB_SYMBOL);

export const SHIB_TWIN_TOKEN_SYMBOL = 'ckSHIB';

export const SHIB_TOKEN: RequiredErc20Token = {
	id: SHIB_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'SHIBA INU',
	symbol: 'SHIB',
	decimals: SHIB_DECIMALS,
	icon: shib,
	address: ckErc20Production[SHIB_TWIN_TOKEN_SYMBOL].erc20ContractAddress,
	exchange: 'erc20',
	twinTokenSymbol: SHIB_TWIN_TOKEN_SYMBOL
};
