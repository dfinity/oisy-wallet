import { ETHEREUM_NETWORK } from '$env/networks.env';
import { ckErc20Production } from '$env/networks.icrc.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import oct from '$icp-eth/assets/oct.svg';

export const OCT_DECIMALS = 18;

export const OCT_SYMBOL = 'OCT';

export const OCT_TOKEN_ID: unique symbol = Symbol(OCT_SYMBOL);

export const OCT_TWIN_TOKEN_SYMBOL = 'ckOCT';

export const OCT_TOKEN: RequiredErc20Token = {
	id: OCT_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Octopus Network Token',
	symbol: OCT_SYMBOL,
	decimals: OCT_DECIMALS,
	icon: oct,
	address: ckErc20Production[OCT_TWIN_TOKEN_SYMBOL].erc20ContractAddress,
	exchange: 'erc20',
	twinTokenSymbol: OCT_TWIN_TOKEN_SYMBOL
};
