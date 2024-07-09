import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import { ckErc20Production, ckErc20Staging } from '$env/tokens.ckerc20.env';
import type { RequiredErc20Token } from '$eth/types/erc20';
import pepe from '$icp-eth/assets/pepe.svg';

export const PEPE_DECIMALS = 18;

export const PEPE_SYMBOL = 'PEPE';

export const PEPE_TOKEN_ID: unique symbol = Symbol(PEPE_SYMBOL);

export const PEPE_TWIN_TOKEN_SYMBOL = 'ckPEPE';

export const PEPE_TOKEN: RequiredErc20Token = {
	id: PEPE_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Pepe',
	symbol: PEPE_SYMBOL,
	decimals: PEPE_DECIMALS,
	icon: pepe,
	address: ckErc20Production[PEPE_TWIN_TOKEN_SYMBOL].erc20ContractAddress,
	exchange: 'erc20',
	twinTokenSymbol: PEPE_TWIN_TOKEN_SYMBOL
};

export const SEPOLIA_PEPE_SYMBOL = 'SepoliaPEPE';

export const SEPOLIA_PEPE_TOKEN_ID: unique symbol = Symbol(SEPOLIA_PEPE_SYMBOL);

export const SEPOLIA_PEPE_TWIN_TOKEN_SYMBOL = 'ckSepoliaPEPE';

export const SEPOLIA_PEPE_TOKEN: RequiredErc20Token = {
	id: SEPOLIA_PEPE_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Pepe',
	symbol: PEPE_SYMBOL,
	decimals: PEPE_DECIMALS,
	icon: pepe,
	address: ckErc20Staging[SEPOLIA_PEPE_TWIN_TOKEN_SYMBOL].erc20ContractAddress,
	exchange: 'erc20',
	twinTokenSymbol: SEPOLIA_PEPE_TWIN_TOKEN_SYMBOL
};
