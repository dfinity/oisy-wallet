import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks.env';
import type { EnvTokenErc20 } from '$env/types/env-token-erc20';
import link from '$icp-eth/assets/link.svg';

export const LINK_DECIMALS = 18;

export const LINK_SYMBOL = 'LINK';

export const LINK_TOKEN_ID: unique symbol = Symbol(LINK_SYMBOL);

export const LINK_TOKEN: EnvTokenErc20 = {
	id: LINK_TOKEN_ID,
	network: ETHEREUM_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'ChainLink Token',
	symbol: LINK_SYMBOL,
	decimals: LINK_DECIMALS,
	icon: link,
	exchange: 'erc20',
	twinTokenSymbol: 'ckLINK'
};

export const SEPOLIA_LINK_SYMBOL = 'SepoliaLINK';

export const SEPOLIA_LINK_TOKEN_ID: unique symbol = Symbol(SEPOLIA_LINK_SYMBOL);

export const SEPOLIA_LINK_TOKEN: EnvTokenErc20 = {
	id: SEPOLIA_LINK_TOKEN_ID,
	network: SEPOLIA_NETWORK,
	standard: 'erc20',
	category: 'default',
	name: 'ChainLink Token',
	symbol: LINK_SYMBOL,
	decimals: LINK_DECIMALS,
	icon: link,
	exchange: 'erc20',
	twinTokenSymbol: 'ckSepoliaLINK'
};
