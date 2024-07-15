import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import type { EnvTokenErc20 } from '$env/types/env-token-erc20';
import pepe from '$icp-eth/assets/pepe.svg';

export const PEPE_DECIMALS = 18;

export const PEPE_SYMBOL = 'PEPE';

export const PEPE_TOKEN_ID: unique symbol = Symbol(PEPE_SYMBOL);

export const PEPE_TOKEN: EnvTokenErc20 = {
	id: PEPE_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Pepe',
	symbol: PEPE_SYMBOL,
	decimals: PEPE_DECIMALS,
	icon: pepe,
	exchange: 'erc20',
	twinTokenSymbol: 'ckPEPE'
};

export const SEPOLIA_PEPE_SYMBOL = 'SepoliaPEPE';

export const SEPOLIA_PEPE_TOKEN_ID: unique symbol = Symbol(SEPOLIA_PEPE_SYMBOL);

export const SEPOLIA_PEPE_TOKEN: EnvTokenErc20 = {
	id: SEPOLIA_PEPE_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'Pepe',
	symbol: PEPE_SYMBOL,
	decimals: PEPE_DECIMALS,
	icon: pepe,
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepoliaPEPE'
};
